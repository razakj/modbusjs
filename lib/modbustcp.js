var EventEmitter = require('events');
var util = require('util');
var net = require('net');
var helper = require('./helper');
var errorcodes = require('./errorcodes');
var functioncodes = require('./functioncodes');

var PROTOCOL_ID = 0;

function triggerCallback(cb, data) {
    if(typeof cb === "function")
        cb(data);
}

function validateRequest(uId, fCode, address, length) {
    if (!helper.isUInt8(uId))
        return new Error("UnitID is out of bounds. [UInt8 required]");

    if (!helper.isUInt8(fCode))
        return new Error("FunctionCode is out of bounds. [UInt8 required]");

    if (!functioncodes[fCode])
        return new Error("Invalid function code.");

    if (!helper.isUInt16(address))
        return new Error("Address is out of bounds. [UInt16 required]");

    if (!helper.isUInt16(length))
        return new Error("Length is out of bounds. [UInt16 required]");

    return null;
}

function createRequest(tId, uId, fCode, address, length, options) {
    var reqBuffer = new Buffer(12);
    // mbap headers
    reqBuffer.writeUInt16BE(tId, 0); // transaction Id created above
    reqBuffer.writeUInt16BE(PROTOCOL_ID, 2); // Modbus protocol
    reqBuffer.writeUInt16BE(6, 4); // Length of pdu + unit id
    reqBuffer.writeUInt8(uId, 6); // Unit id
    // pdu
    reqBuffer.writeUInt8(fCode, 7); // Modbus function code
    reqBuffer.writeUInt16BE(address, 8); // Modbus starting address
    reqBuffer.writeUInt16BE(length, 10); // Number of registers to read
    var request = {
        transactionId: tId,
        unitId: uId,
        functionCode: fCode,
        address: address,
        length: length,
        buffer: reqBuffer,
        options: (typeof options === "function") || options == undefined || options == null ? {} : options
    };
    return request;
}

function validateResponse(request, uId, fce, data) {
    if(request.unitId != uId)
        return new Error("Requested UnitID and Response UnitId doesn't match. [Requested "+request.unitId+", Response "+uId);
    if(request.functionCode != fce) {
        if(fce in errorcodes.ERROR_CODES) {
            var error = errorcodes[data];
            if(error) {
                return new Error(error.name);
            } else {
                return new Error("Unknown error code - " + data.toString(16));
            }
        } else {
            return new Error("Unexpected response function code - " + fce.toString(16));
        }
    }
    if(!functioncodes[fce])
        return new Error("Invalid function code - " + fce.toString(16));
    return null;
}

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

var ModbusTcp = function (host, port, options) {
    if (!host || !port)
        throw new Error("Host and Port must be specified!");
    this._host = host;
    this._port = port;
    this._debug = function(msg) {
        if(options && options.debug) {
            console.error(msg);
        }
    };
    this._transactions = {};
    this._createTransaction = function(callback) {
        var i = 0;
        for(var i = 0; i < 0xffff; i++) {
            if(!this._transactions[i]) {
                this._transactions[i] = {callback: callback};
                break;
            }
        }
        if(i == 0xffff) {
            return -1;
        } else {
            return i;
        }
    };
    this._write = function (fCode, address, length, options, callback) {
        if (this._socket) {
            var uId = 0x01;
            if (typeof options === "function") {
                callback = options;
            } else if (options != null && typeof options !== "function" && options.unitId) {
                uId = options.unitId;
            }
            var validationResult = validateRequest(uId, fCode, address, length);
            if(validationResult != null) {
                triggerCallback(callback, validationResult);
            } else {
                var tId = this._createTransaction(callback);
                if (tId < 0) {
                    callback(new Error("Concurrent transactions limit reached."));
                } else {
                    var request = createRequest(tId, uId, fCode, address, length, options);
                    this._transactions[tId]["request"] = request;
                    this._socket.write(request.buffer);
                }
            }
        } else {
            triggerCallback(callback, new Error("No connection."));
        }
    };
    EventEmitter.call(this);
};

util.inherits(ModbusTcp, EventEmitter);

ModbusTcp.prototype.connect = function(callback) {
    var p = this;
    var socket = net.connect(this._port, this._host, function(){
        p.emit("connected");
        if(callback)
            callback();
    });
    socket.on('error', function(err) {
        p.emit('error', err);
    });
    socket.on('end', function(){
        p.emit('disconnected');
    });
    socket.on('data', function(buf){
        for(var i = 0; i < buf.length; i) {
            // Parse response
            var tId = buf.readUInt16BE(i); // Transaction ID
            var pId = buf.readUInt16BE(i+2); // Modbus protocol ID
            var responseLength = buf.readUInt16BE(i+4); // Length of response
            var uId = buf.readUInt8(i+6); // Unit ID
            var fce = buf.readUInt8(i+7); // Modbus function code
            var dataLength = buf.readUInt8(i+8); // Data length
            if(p._transactions[tId]) {
                var response = createResponse(tId,pId,responseLength,uId,fce,dataLength);
                var error = validateResponse(p._transactions[tId].request, uId, fce, dataLength);
                if(error) {
                    response["errorCode"] = dataLength;
                    response["error"] = error;
                    p._transactions[tId].callback(error, null, p._transactions[tId].request, response);
                    i = i + 10;
                } else {
                    response["dataLength"] = dataLength;
                    response["dataBuffer"] = new Buffer(dataLength);
                    i = i + 9; // move index to data position
                    for(var e = 0; e < dataLength; e++) {
                        response["dataBuffer"][e] = buf[i+e];
                    }
                    response["data"] = functioncodes[fce].handler(p._transactions[tId].request, response);
                    p._transactions[tId].callback(null, response["data"], p._transactions[tId].request, response);
                    i = i + dataLength; // move index to the end of transaction
                }
                delete p._transactions[tId];
            } else {
                if(fce == 0x81) {
                    i = i + 10;
                } else {
                    i = i + 9 + dataLength;
                }
            }
        }
    });
    this._socket = socket;
};

ModbusTcp.prototype.disconnect = function(callback) {
    if(this._socket) {
        this._socket.end();
        callback();
    }
};

ModbusTcp.prototype.readCoils = function(address, length, options, callback) {
    this._write(0x01, address, (length > 2000 ? 2000 : length), options, callback);
};

ModbusTcp.prototype.readInputs = function(address, length, options, callback) {
    this._write(0x02, address, (length > 2000 ? 2000 : length), options, callback);
};

ModbusTcp.prototype.readHoldingRegisters = function(address, length, options, callback) {
    this._write(0x03, address, (length > 125 ? 125 : length), options, callback);
};

ModbusTcp.prototype.readInputgRegisters = function(address, length, options, callback) {
    this._write(0x04, address, (length > 125 ? 125 : length), options, callback);
};


module.exports = ModbusTcp;