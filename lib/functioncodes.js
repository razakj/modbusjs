var helper = require('./helper');

function coilsParser(request, response) {
    var result = [];
    var totalCount = 0;
    for (var i = 0; i < response.bufferDataLength; i++) {
        for (var e = 0; e < 8 && totalCount < request.length; e++) {
            result.push((response.bufferData[i] & (1 << e)) > 0);
            totalCount++;
        }
    }
    return result;
}

function registersParser(request, response) {
    var result = [];
    var readFunction = request.options.unsigned ? "readUInt16BE" : "readInt16BE";
    for(var i = 0; i < response.bufferDataLength; i+=2) {
        result.push(response.bufferData[readFunction](i));
    }
    return result;
}

function baseRequestValidator(uId, address, varData) {
    if (!helper.isUInt8(uId))
        return new Error("UnitID is out of bounds. [UInt8 required]");

    if (!helper.isUInt16(address))
        return new Error("Address is out of bounds. [UInt16 required]");

    if (!helper.isUInt16(varData))
        return new Error("Length or Value is out of bounds. [UInt16 required]");

    return null;
}

function baseRequestBuilder(uId, fce, address, varData, options) {
    var reqBuffer = new Buffer(5);
    // pdu
    reqBuffer.writeUInt8(fce, 0); // Modbus function code
    reqBuffer.writeUInt16BE(address, 1); // Modbus starting address
    reqBuffer.writeUInt16BE(varData, 3); // Either value or length
    var request = {
        unitId: uId,
        protocolId: 0x0000,
        functionCode: fce,
        address: address,
        buffer: reqBuffer,
        options: (options == undefined || options == null) ? {} : options
    };
    return request;
}

function baseResponseValidator(request, uId, fce, data) {
    if(request.unitId != uId)
        return new Error("Requested UnitID and Response UnitId doesn't match. [Requested "+request.unitId+", Response "+uId);
    if(request.functionCode != fce) {
        return new Error("Unexpected response function code - " + fce.toString(16));
    }
    return null;
}

function baseResponseBuilder(uId, fce) {
    return {
        unitId: uId,
        protocolId: 0x0000,
        functionCode: fce
    };
}

// ERROR codes handling

var EXCEPTION_CODES = module.exports.EXCEPTION_CODES = {
    0x01 : "ILLEGAL FUNCTION",
    0x02 : "ILLEGAL DATA ADDRESS",
    0x03 : "ILLEGAL DATA VALUE",
    0x04 : "SLAVE DEVICE FAILURE",
    0x05 : "ACKNOWLEDGE",
    0x06 : "SLAVE DEVICE BUSY",
    0x07 : "MEMORY PARITY ERROR",
    0x0A : "GATEWAY PATH UNAVAILABLE",
    0x0B : "GATEWAY TARGET DEVICE FAILED TO RESPOND"
};

function baseErrorCodeHandler(request, uId, exceptionCode){
    var error = EXCEPTION_CODES[exceptionCode];
    if(error) {
        return new Error(error);
    } else {
        return new Error("Unknown exception code - " + exceptionCode.toString(16));
    }
};

var FUNCTION_HANDLERS = module.exports.FUNCTION_HANDLERS = {
    0x01 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, address, length)
        },
        requestBuilder: function(uId, address, length, options) {
            var request = baseRequestBuilder(uId, 0x01, address, length, options);
            request["length"] = length;
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x01, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x01, responseLength);
            response["bufferDataLength"] = buf[0];
            response["bufferData"] = buf.slice(1);
            response["data"] = coilsParser(request, response);
            return response;
        }
    },
    0x02 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, address, length)
        },
        requestBuilder: function(uId, address, length, options) {
            var request = baseRequestBuilder(uId, 0x02, address, length, options);
            request["length"] = length;
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x02, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x02, responseLength);
            response["bufferDataLength"] = buf[0];
            response["bufferData"] = buf.slice(1);
            response["data"] = coilsParser(request, response);
            return response;
        }
    },
    0x03 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, address, length)
        },
        requestBuilder: function(uId, address, length, options) {
            var request = baseRequestBuilder(uId, 0x03, address, length, options);
            request["length"] = length;
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x03, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x03, responseLength);
            response["bufferDataLength"] = buf[0];
            response["bufferData"] = buf.slice(1);
            response["data"] = registersParser(request, response);
            return response;
        }
    },
    0x04 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, address, length)
        },
        requestBuilder: function(uId, address, length, options) {
            var request = baseRequestBuilder(uId, 0x04, address, length, options);
            request["length"] = length;
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x04, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x04, responseLength);
            response["bufferDataLength"] = buf[0];
            response["bufferData"] = buf.slice(1);
            response["data"] = registersParser(request, response);
            return response;
        }
    },
    0x05 : {
        requestValidator: function(uId, address, value) {
            if(!helper.isValidCoil(value)) {
                return new Error("Invalid value. Must be boolean or number 0/1.");
            }
            return baseRequestValidator(uId, address, value)
        },
        requestBuilder: function(uId, address, value, options) {
            var formatedValue = value == 1 || value == true ? 0xFF00 : 0x0000;
            var request = baseRequestBuilder(uId, 0x05, address, formatedValue, options);
            request["value"] = value;
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x05, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x05, responseLength);
            response["address"] = buf.readUInt16BE(0);
            response["data"] = buf.readUInt16BE(2) == 0xFF00 ? true : false;
            return response;
        }
    },
    0x06 : {
        requestValidator: function(uId, address, value) {
            return baseRequestValidator(uId, address, value)
        },
        requestBuilder: function(uId, address, value, options) {
            var request = baseRequestBuilder(uId, 0x06, address, value, options);
            request["value"] = value;
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x06, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x05, responseLength);
            response["address"] = buf.readUInt16BE(0);
            response["data"] = buf.readUInt16BE(2);
            return response;
        }
    },
    0x0F : {
        requestValidator: function(uId, address, values) {
            if (!helper.isUInt8(uId))
                return new Error("UnitID is out of bounds. [UInt8 required]");
            if (!helper.isUInt16(address))
                return new Error("Address is out of bounds. [UInt16 required]");
            if(!Array.isArray(values))
                return new Error("Values must be a valid array.");

            var err = null;
            values.some(function(value){
                if(!helper.isValidCoil(value)) {
                    err = new Error("Invalid value. Must be boolean or number 0/1.");
                    return true;
                }
            });

            return err;
        },
        requestBuilder: function(uId, address, values, options) {
            var bit = 0;
            var byte = 0;
            var valuesBuffer = new Buffer(Math.ceil(values.length / 8));
            var currByte = 0x00;
            for(var v = 0; v < values.length; v++) {
                currByte = ((values[v] & 1) << bit) | currByte;
                if(bit == 7 || values[v+1] == undefined) {
                    valuesBuffer[byte] = currByte;
                    currByte = 0x00;
                    byte++;
                    bit = 0;
                } else {
                    bit++;
                }
            }
            var pduBuffer = new Buffer(6);
            pduBuffer.writeUInt8(0x0F, 0); // Modbus function code
            pduBuffer.writeUInt16BE(address, 1); // Modbus starting address
            pduBuffer.writeUInt16BE(values.length, 3); // Output values
            pduBuffer.writeUInt8(valuesBuffer.length, 5); // Bytes count
            var reqBuffer = Buffer.concat([pduBuffer, valuesBuffer], pduBuffer.length + valuesBuffer.length)
            var request = {
                unitId: uId,
                protocolId: 0x0000,
                functionCode: 0x0F,
                address: address,
                buffer: reqBuffer,
                options: (options == undefined || options == null) ? {} : options
            };
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x0F, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x0F, responseLength);
            response["address"] = buf.readUInt16BE(0);
            response["data"] = buf.readUInt16BE(2);
            return response;
        }
    },
    0x10 : {
        requestValidator: function(uId, address, values) {
            if (!helper.isUInt8(uId))
                return new Error("UnitID is out of bounds. [UInt8 required]");
            if (!helper.isUInt16(address))
                return new Error("Address is out of bounds. [UInt16 required]");
            if(!Array.isArray(values))
                return new Error("Values must be a valid array.");

            var err = null;
            values.some(function(value){
                if(!helper.isUInt16(value)) {
                    err = new Error("Invalid value. Must be UInt16.");
                    return true;
                }
            });
            return err;
        },
        requestBuilder: function(uId, address, values, options) {
            var valuesBuffer = new Buffer(values.length*2);
            var i = 0;
            values.forEach(function(value){
                valuesBuffer.writeUInt16BE(value, i);
                i+=2;
            });
            var pduBuffer = new Buffer(6);
            pduBuffer.writeUInt8(0x10, 0); // Modbus function code
            pduBuffer.writeUInt16BE(address, 1); // Modbus starting address
            pduBuffer.writeUInt16BE(values.length, 3); // Output values
            pduBuffer.writeUInt8(valuesBuffer.length, 5); // Bytes count
            var reqBuffer = Buffer.concat([pduBuffer, valuesBuffer], pduBuffer.length + valuesBuffer.length);
            var request = {
                unitId: uId,
                protocolId: 0x0000,
                functionCode: 0x10,
                address: address,
                buffer: reqBuffer,
                options: (options == undefined || options == null) ? {} : options
            };
            return request;
        },
        responseValidator: function(request, uId, data){
            return baseResponseValidator(request,uId,0x10, data);
        },
        responseBuilder: function(request, uId, responseLength, buf) {
            var response = baseResponseBuilder(uId, 0x10, responseLength);
            response["address"] = buf.readUInt16BE(0);
            response["data"] = buf.readUInt16BE(2);
            return response;
        }
    },
    0x81 : {
        responseValidator: baseErrorCodeHandler
    },
    0x82 : {
        responseValidator: baseErrorCodeHandler
    },
    0x83 : {
        responseValidator: baseErrorCodeHandler
    },
    0x84 : {
        responseValidator: baseErrorCodeHandler
    },
    0x85 : {
        responseValidator: baseErrorCodeHandler
    },
    0x86 : {
        responseValidator: baseErrorCodeHandler
    },
    0x8F : {
        responseValidator: baseErrorCodeHandler
    },
    0x90 : {
        responseValidator: baseErrorCodeHandler
    }
};