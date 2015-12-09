var EventEmitter = require('events');
var util = require('util');
var helper = require('./helper');

var ModbusClient = function (writeRequest, options) {
    this._writeRequest = writeRequest;
    this._debug = function(msg) {
        if(options && options.debug) {
            console.error(msg);
        }
    };
    this.readCoils = function(address, length, options) {
        return this._writeRequest(0x01, address, (length > 2000 ? 2000 : length), options);
    };
    this.readDiscreteInputs = function(address, length, options) {
        return this._writeRequest(0x02, address, (length > 2000 ? 2000 : length), options);
    };
    this.readHoldingRegisters = function(address, length, options) {
        return this._writeRequest(0x03, address, (length > 125 ? 125 : length), options);
    };
    this.readInputgRegisters = function(address, length, options) {
        return this._writeRequest(0x04, address, (length > 125 ? 125 : length), options);
    };
    this.writeSingleCoil = function(address, value, options) {
        return this._writeRequest(0x05, address, value, options);
    };
    this.writeSingleRegister = function(address, value, options) {
        return this._writeRequest(0x06, address, value, options);
    };
    this.writeMultipleCoils = function(address, values, options) {
        return this._writeRequest(0x0F, address, values, options);
    };
    this.writeMultipleCoilsSameValue = function(address, length, value, options) {
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
    this.writeMultipleRegisters = function(address, values, options) {
        return this._writeRequest(0x10, address, values, options);
    };
    this.writeMultipleRegistersSameValue = function(address, length, value, options) {
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

    EventEmitter.call(this);
};

util.inherits(ModbusClient, EventEmitter);

module.exports = ModbusClient;