var EventEmitter = require('events');
var util = require('util');
var net = require('net');
var functioncodes = require('./functioncodes');
var helper = require('./helper');

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
                var fceHandler = functioncodes.FUNCTION_HANDLERS[fce];
                if(!fceHandler) {
                    reject(new Error("Invalid function code."));
                } else {
                    var validationResult = fceHandler.requestValidator(uId, address, varData);
                    if(validationResult != null) {
                        reject(validationResult);
                    } else {
                        var tId = self._createTransaction(resolve, reject, (options && options.timeout ? options.timeout*1000 : 5000));
                        var request = fceHandler.requestBuilder(uId, address, varData, options);
                        request["transactionId"] = tId;
                        // mbap headers
                        var mbapHeaders = new Buffer(7);
                        mbapHeaders.writeUInt16BE(tId, 0); // transaction Id created above
                        mbapHeaders.writeUInt16BE(0x0000, 2); // Modbus protocol
                        mbapHeaders.writeUInt16BE(request.buffer.length + 1, 4); // Length of pdu + unit id
                        mbapHeaders.writeUInt8(uId, 6); // Unit id
                        request.buffer = Buffer.concat([mbapHeaders, request.buffer], mbapHeaders.length + request.buffer.length);
                        self._transactions[tId].request = request;
                        self._socket.write(request.buffer);
                        self._transactions[tId].timeout();
                    }
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
                if(self._transactions[tId]) {
                    // Clear timeout timer and delete it
                    clearTimeout(self._timeoutsHandler[tId]);
                    delete self._timeoutsHandler[tId];
                    var error = functioncodes.FUNCTION_HANDLERS[fce].responseValidator(self._transactions[tId].request, uId, buf.readUInt8(i+8));
                    if(error) {
                        self._transactions[tId].reject(error);
                    } else {
                        var resPduBuf = new Buffer(responseLength - 2);
                        for(var b = 0; b < responseLength - 2; b++) {
                            resPduBuf[b] = buf[i+8+b];
                        }
                        var response = functioncodes.FUNCTION_HANDLERS[fce].responseBuilder(self._transactions[tId].request, uId, responseLength, resPduBuf);
                        response["transactionId"] = tId;
                        self._transactions[tId].resolve({
                            result: response["data"],
                            request: self._transactions[tId].request,
                            response: response
                        });
                    }
                    delete self._transactions[tId];
                }
                i = i + responseLength + 6;
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
    return this._writeRequest(0x05, address, value, options);
};

ModbusTcpClient.prototype.writeSingleRegister = function(address, value, options) {
    return this._writeRequest(0x06, address, value, options);
};

ModbusTcpClient.prototype.writeMultipleCoils = function(address, values, options) {
    return this._writeRequest(0x0F, address, values, options);
};

ModbusTcpClient.prototype.writeMultipleCoilsSameValue = function(address, length, value, options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!helper.isValidCoil(value))
            reject(new Error("Invalid value. Must be boolean or number 0/1."));

        var values = [];
        for(var i = 0; i < length; i++) {
            values[i] = value;
        }
        return resolve(self._writeRequest(0x0F, address, values, options));
    });
};

ModbusTcpClient.prototype.writeMultipleRegisters = function(address, values, options) {
    return this._writeRequest(0x10, address, values, options);
};

ModbusTcpClient.prototype.writeMultipleRegistersSameValue = function(address, length, value, options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!helper.isUInt16(value))
            reject(new Error("Invalid value. Must be UInt16."));

        var values = [];
        for(var i = 0; i < length; i++) {
            values[i] = value;
        }
        return resolve(self._writeRequest(0x10, address, values, options));
    });
};


module.exports = ModbusTcpClient;