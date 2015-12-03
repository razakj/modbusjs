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

module.exports.FUNCTION_HANDLERS = {
    0x01 : coilsParser,
    0x02 : coilsParser,
    0x03 : registersParser,
    0x04 : registersParser
};

module.exports.WRITE_FUNCTIONS = [0x05, 0x06];
module.exports.READ_FUNCTIONS = [0x01, 0x02, 0x03, 0x04];

module.exports.isWriteCode = function(fce) {
    return this.WRITE_FUNCTIONS.indexOf(fce) > -1;
};

module.exports.isReadCode = function(fce) {
    return this.READ_FUNCTIONS.indexOf(fce) > -1;
};

module.exports.convertValue = function(fce, value) {
    if([0x05].indexOf(fce) > 0) {
        return value == 0xFF00 ? true : false;
    }
    return value;
};