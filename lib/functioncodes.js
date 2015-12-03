var helper = require('./helper');
var errorcodes = require('./errorcodes');

function coilsParser(request, response) {
    var result = [];
    var totalCount = 0;
    for (var i = 0; i < response.dataLength; i++) {
        for (var e = 0; e < 8 && totalCount < request.length; e++) {
            result.push((response.dataBuffer[i] & (1 << e)) > 0);
            totalCount++;
        }
    }
    return result;
}

function registersParser(request, response) {
    var result = [];
    var readFunction = request.options.unsigned ? "readUInt16BE" : "readInt16BE";
    for(var i = 0; i < response.dataLength; i+=2) {
        result.push(response.dataBuffer[readFunction](i));
    }
    return result;
}

function baseRequestValidator(uId, fce, address, varData) {
    if (!helper.isUInt8(uId))
        return new Error("UnitID is out of bounds. [UInt8 required]");

    if (!helper.isUInt8(fce))
        return new Error("FunctionCode is out of bounds. [UInt8 required]");

    if (!(fce in FUNCTION_HANDLERS))
        return new Error("Invalid function code.");

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
    return null;
}

function baseResponseBuilder(uId, fce, responseLength) {
    return {
        unitId: uId,
        protocolId: 0x0000,
        reponseLength: responseLength,
        functionCode: fce
    };
}

var FUNCTION_HANDLERS = module.exports.FUNCTION_HANDLERS = {
    0x01 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, 0x01, address, length)
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
            response["dataLength"] = buf[0];
            response["dataBuffer"] = buf.slice(1);
            response["data"] = coilsParser(request, response);
            return response;
        }
    },
    0x02 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, 0x02, address, length)
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
            response["dataLength"] = buf[0];
            response["dataBuffer"] = buf.slice(1);
            response["data"] = coilsParser(request, response);
            return response;
        }
    },
    0x03 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, 0x03, address, length)
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
            response["dataLength"] = buf[0];
            response["dataBuffer"] = buf.slice(1);
            response["data"] = registersParser(request, response);
            return response;
        }
    },
    0x04 : {
        requestValidator: function(uId, address, length) {
            return baseRequestValidator(uId, 0x04, address, length)
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
            response["dataLength"] = buf[0];
            response["dataBuffer"] = buf.slice(1);
            response["data"] = registersParser(request, response);
            return response;
        }
    },
    0x05 : {
        requestValidator: function(uId, address, value) {
            return baseRequestValidator(uId, 0x05, address, value)
        },
        requestBuilder: function(uId, address, value, options) {
            var request = baseRequestBuilder(uId, 0x05, address, value, options);
            request["value"] = value == 0xFF00 ? true : false;
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
            return baseRequestValidator(uId, 0x06, address, value)
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
    }
};