var EventEmitter = require('events');
var util = require('util');
var net = require('net');
var helper = require('./helper');
var errorcodes = require('./errorcodes');
var functioncodes = require('./functioncodes');

var PROTOCOL_ID = 0;

/**
 * All the validations which should take place before creating and sending request to prevent any
 * unexpected errors.
 * **/
function validateRequest(uId, fce, address, varData) {
    if (!helper.isUInt8(uId))
        return new Error("UnitID is out of bounds. [UInt8 required]");

    if (!helper.isUInt8(fce))
        return new Error("FunctionCode is out of bounds. [UInt8 required]");

    if (!functioncodes.isReadCode(fce) && !functioncodes.isWriteCode(fce))
        return new Error("Invalid function code.");

    if (!helper.isUInt16(address))
        return new Error("Address is out of bounds. [UInt16 required]");

    if (!helper.isUInt16(varData))
        return new Error("Length or Value is out of bounds. [UInt16 required]");

    return null;
}

/**
 * Create a Request object. Buffer is then written to the network socket and Request stored
 * with current transaction for later reference and error check.
 * **/
function createRequest(tId, uId, fce, address, varData, options) {
    var reqBuffer = new Buffer(12);
    // mbap headers
    reqBuffer.writeUInt16BE(tId, 0); // transaction Id created above
    reqBuffer.writeUInt16BE(PROTOCOL_ID, 2); // Modbus protocol
    reqBuffer.writeUInt16BE(6, 4); // Length of pdu + unit id
    reqBuffer.writeUInt8(uId, 6); // Unit id
    // pdu
    reqBuffer.writeUInt8(fce, 7); // Modbus function code
    reqBuffer.writeUInt16BE(address, 8); // Modbus starting address
    reqBuffer.writeUInt16BE(varData, 10); // Number of registers to read
    var request = {
        requestType: functioncodes.isReadCode(fce) ? 'READ' : 'WRITE',
        transactionId: tId,
        unitId: uId,
        functionCode: fce,
        address: address,
        buffer: reqBuffer,
        options: (typeof options === "function") || options == undefined || options == null ? {} : options
    };
    if(functioncodes.isWriteCode(fce)) {
        request["value"] = functioncodes.convertValue(fce, varData);
    } else {
        request["length"] = varData;
    }
    return request;
}

/**
 * Validation of incoming response to check for any unexpected input and for Modbus defined errors
 * **/
function validateResponse(request, uId, fce, data) {
    if(request.unitId != uId)
        return new Error("Requested UnitID and Response UnitId doesn't match. [Requested "+request.unitId+", Response "+uId);
    if(request.functionCode != fce) {
        if(errorcodes.ERROR_CODES.indexOf(fce) > -1) {
            var error = errorcodes.EXCEPTION_CODES[data];
            if(error) {
                return new Error(error);
            } else {
                return new Error("Unknown exception code - " + data.toString(16));
            }
        } else {
            return new Error("Unexpected response function code - " + fce.toString(16));
        }
    }
    if(!functioncodes.isReadCode(fce) && !functioncodes.isWriteCode(fce))
        return new Error("Invalid function code - " + fce.toString(16));
    return null;
}

/**
 * Helper to create a response object which is then passed as part of the result.
 * **/
function createResponse(tId, pId, responseLength, uId, fce) {
    var response = {
        transactionId: tId,
        protocolId: pId,
        reponseLength: responseLength,
        unitId: uId,
        functionCode: fce
    };
    return response;
}

/**
 * Main ModbusTcpClient object which is initialized by consumer and exposes all the functions.
 * **/
var ModbusTcpClient = function (host, port, options) {
    if (!host || !port)
        throw new Error("Host and Port must be specified!");
    this._host = host;
    this._port = port;
    this._connected = false;
    this._debug = function(msg) {
        if(options && options.debug) {
            console.error(msg);
        }
    };
    this._transactions = {};
    this._timeoutsHandler = {};
    this._createTransaction = function(resolve, reject, timeout) {
        var self = this;
        var i = 0;
        for(var i = 0; i < 0xffff; i++) {
            if(!this._transactions[i]) {
                this._transactions[i] = {resolve: resolve, reject: reject, timeout: function() {
                    self._timeoutsHandler[i] = setTimeout(function () {
                        delete self._transactions[i];
                        delete self._timeoutsHandler[i];
                        reject(new Error("Request timeout. (" + timeout / 1000 + "s)"));
                    }, timeout);
                }};
                break;
            }
        }
        if(i == 0xffff) {
            reject(new Error("Concurrent transactions limit reached."));
        } else {
            return i;
        }
    };
    this._writeRequest = function (fce, address, varData, options) {
        var self = this;
        return new Promise(function(resolve, reject){
            if (self._socket && self._connected) {
                var uId = options && options.unitId ? options.unitId : 0x01;
                var validationResult = validateRequest(uId, fce, address, varData);
                if(validationResult != null) {
                    reject(validationResult);
                } else {
                    var tId = self._createTransaction(resolve, reject, (options && options.timeout ? options.timeout*1000 : 5000));
                    var request = self._transactions[tId]["request"] = createRequest(tId, uId, fce, address, varData, options);
                    self._socket.write(request.buffer);
                    self._transactions[tId].timeout();
                }
            } else {
                reject(new Error("No connection."));
            }
        });
    };
    EventEmitter.call(this);
};

util.inherits(ModbusTcpClient, EventEmitter);

ModbusTcpClient.prototype.connect = function() {
    var self = this;
    return new Promise(function(resolve, reject){
        var socket = net.connect(self._port, self._host, function(){
            self._connected = true;
            self.emit("connect");
            resolve();
        });
        socket.on('error', function(err) {
            self.emit('error', err);
            if(!self._connected)
                reject(err);
        });
        socket.on('end', function() {
            self._connected = false;
            self.emit('disconnect');
        });
        socket.on('close', function() {
            self._connected = false;
            self.emit('disconnect');
        });
        socket.on('data', function(buf) {
            for(var i = 0; i < buf.length; i) {
                // Parse response
                var tId = buf.readUInt16BE(i); // Transaction ID
                var pId = buf.readUInt16BE(i+2); // Modbus protocol ID
                var responseLength = buf.readUInt16BE(i+4); // Length of response
                var uId = buf.readUInt8(i+6); // Unit ID
                var fce = buf.readUInt8(i+7); // Modbus function code
                var varData, outputAddress;
                if(functioncodes.isWriteCode(fce)) {
                    outputAddress = buf.readUInt16BE(i+8); // Output address
                    varData = buf.readUInt16BE(i+10); // Output value
                } else {
                    varData = buf.readUInt8(i+8); // Data length or exception code
                }
                if(self._transactions[tId]) {
                    // Clear timeout timer and delete it
                    clearTimeout(self._timeoutsHandler[tId]);
                    delete self._timeoutsHandler[tId];
                    // Create response and then validate it (reponse object is required even in case of an error
                    var response = createResponse(tId,pId,responseLength,uId,fce);
                    var error = validateResponse(self._transactions[tId].request, uId, fce, varData);
                    if(error) {
                        response["errorCode"] = varData;
                        response["error"] = error;
                        self._transactions[tId].reject(error);
                        i = i + (functioncodes.isWriteCode(fce) ? 12 : 10);
                    } else {
                        if(functioncodes.isWriteCode(fce)) {
                            response["value"] = functioncodes.convertValue(fce, varData);
                            response["address"] = outputAddress;
                            self._transactions[tId].resolve({
                                value: response["value"],
                                request: self._transactions[tId].request,
                                response: response
                            });
                            i = i + 12;
                        } else {
                            response["dataLength"] = varData;
                            response["dataBuffer"] = new Buffer(varData);
                            i = i + 9; // move index to data position
                            for (var e = 0; e < varData; e++) {
                                response["dataBuffer"][e] = buf[i + e];
                            }
                            response["data"] = functioncodes.FUNCTION_HANDLERS[fce](self._transactions[tId].request, response);
                            self._transactions[tId].resolve({
                                data: response["data"],
                                request: self._transactions[tId].request,
                                response: response
                            });
                            i = i + varData; // move index to the end of transaction
                        }
                    }
                    delete self._transactions[tId];
                } else {
                    if(fce == 0x81) {
                        i = i + 10;
                    } else {
                        i = i + 9 + dataLength;
                    }
                }
            }
        });
        self._socket = socket;
    });
};

ModbusTcpClient.prototype.disconnect = function() {
    var self = this;
    return new Promise(function(resolve, reject){
        if(self._socket && self._connected) {
            self._socket.destroy();
            self._connected = false;
            resolve();
        } else {
            reject("No active connection");
        }
    });
};

ModbusTcpClient.prototype.readCoils = function(address, length, options) {
    return this._writeRequest(0x01, address, (length > 2000 ? 2000 : length), options);
};

ModbusTcpClient.prototype.readDiscreteInputs = function(address, length, options) {
    return this._writeRequest(0x02, address, (length > 2000 ? 2000 : length), options);
};

ModbusTcpClient.prototype.readHoldingRegisters = function(address, length, options) {
    return this._writeRequest(0x03, address, (length > 125 ? 125 : length), options);
};

ModbusTcpClient.prototype.readInputgRegisters = function(address, length, options) {
    return this._writeRequest(0x04, address, (length > 125 ? 125 : length), options);
};

ModbusTcpClient.prototype.writeSingleCoil = function(address, value, options) {
    var self = this;
    return new Promise(function(resolve, reject){
        if(typeof value != "boolean"
            && typeof value != "number"
            && !([0,1].indexOf(value) < 0)) {
            reject(new Error("Invalid value. Must be boolean or number 0/1."));
        }
        return resolve(self._writeRequest(0x05, address, value == 1 || value == true ? 0xFF00 : 0x0000, options));
    });
};

ModbusTcpClient.prototype.writeSingleRegister = function(address, value, options) {
    return this._writeRequest(0x06, address, value, options);
};

module.exports = ModbusTcpClient;