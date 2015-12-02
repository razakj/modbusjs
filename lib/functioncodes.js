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

module.exports = {
    0x01 : {
        handler: coilsParser
    },
    0x02 : {
        handler: coilsParser
    },
    0x03 : {
        handler: registersParser
    },
    0x04 : {
        handler: registersParser
    }
};