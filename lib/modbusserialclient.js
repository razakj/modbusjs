var util = require('util');
var fs = require('fs');
var path = require('path');
var functioncodes = require('./functioncodes');
var ModbusClient = require('./modbusclient');

function calculateCrc16(buf) {
    var crc = 0xFFFF;
    for (var i = 0; i < buf.length; i++) {
        crc = crc ^ buf[i];
        for (var e = 0; e < 8; e++) {
            var tmp = crc & 0x0001;
            crc = crc >> 1;
            if (tmp) {
                crc = crc ^ 0xA001;
            }
        }
    }
    return crc;
}

var ModbusSerialClient = function (port, options) {
    this._port = port;
    this._options = options;
    this._currentTransaction = null;
    try {
        this._SerialPort = require("serialport");
    } catch(e) {
        console.error("Serialport module must be installed in order to use ModbusSerialClient. Please install it using 'npm install serialport'.");
        process.exit(-1);
    }
    var writeRequest = function(fce, address, varData, options) {
        var self = this;
        return new Promise(function(resolve, reject){
            if (self._serialPort && self._serialPort.isOpen()) {
                var uId = options && options.unitId ? options.unitId : 0x01;
                var fceHandler = functioncodes.FUNCTION_HANDLERS[fce];
                if(!fceHandler) {
                    reject(new Error("Invalid function code."));
                } else {
                    var validationResult = fceHandler.requestValidator(uId, address, varData);
                    if(validationResult != null) {
                        reject(validationResult);
                    } else {
                        var request = fceHandler.requestBuilder(uId, address, varData, options);

                        request.buffer = Buffer.concat([new Buffer(1), request.buffer], request.buffer.length + 1);
                        request.buffer.writeUInt8(uId, 0);

                        var crcBuffer = new Buffer(2);
                        var crc = calculateCrc16(request.buffer);

                        crcBuffer.writeUInt16LE(crc, 0);

                        request.buffer = Buffer.concat([request.buffer, crcBuffer], request.buffer.length + crcBuffer.length);

                        self._serialPort.write(request.buffer,function(err){
                            if(err){
                                reject(err);
                            } else {
                                self._currentTransaction = {request: request, resolve: resolve, reject: reject};
                            }
                        });
                    }
                }
            } else {
                reject(new Error("No connection."));
            }
        });
    };
    ModbusClient.call(this, writeRequest, options);
};

util.inherits(ModbusSerialClient, ModbusClient);

ModbusSerialClient.prototype.connect = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._serialPort = new self._SerialPort.SerialPort(self._port, self._options);
        self._serialPort.on('error', function(err){
            if (self.listeners('error').length > 0)
                self.emit('error', err);
            reject(err);
        });
        self._serialPort.on('open', function(err){
            if(err) {
                reject(err);
            } else {
                self.emit('connect');
                self._serialPort.on('data', function(buf){
                    if(self._currentTransaction) {
                        if(buf.length > 5) {
                            var uId = buf.readUInt8(0);
                            var fce = buf.readUInt8(1);
                            var error = functioncodes.FUNCTION_HANDLERS[self._currentTransaction.request.functionCode].responseValidator(self._currentTransaction.request, uId);
                            if (error) {
                                self._currentTransaction.reject(error);
                            } else {
                                var length = buf.readUInt8(2);
                                var response = functioncodes.FUNCTION_HANDLERS[self._currentTransaction.request.functionCode].responseBuilder(self._currentTransaction.request, uId, length, buf.slice(2, buf.length - 2));
                                console.log(self._currentTransaction.request);
                                self._currentTransaction.resolve(response.data, self._currentTransaction.request, response);
                            }
                            self._currentTransaction = null;
                        } else {
                            self._currentTransaction.reject(new Error("Invalid response"));
                        }
                    } else {
                        console.error('Unexpected data received on serial link');
                    }
                });
                resolve();
            }
        });
    });
};

ModbusSerialClient.prototype.disconnect = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        if(self._serialPort && self._serialPort.isOpen()) {
            self._serialPort.close(function(err){
                if(err){
                    reject(err);
                } else {
                    self.emit('disconnect');
                    resolve();
                }
            })
        } else {
            reject(new Error("No active connection"));
        }
    });
};

ModbusSerialClient.prototype.getAvailablePorts = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._SerialPort) {
            self._SerialPort.list(function(err, ports){
                if(err){
                    reject(err);
                } else {
                    resolve(ports.map(function(port){return port.comName}));
                }
            });
        } else {
            reject(new Error("Serialport module must be installed in order to use ModbusSerialClient. Please install it using 'npm install serialport'."))
        }
    });
};

module.exports = ModbusSerialClient;