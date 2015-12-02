module.exports.isUInt8 = function(value) {
    return !(value > 0xff);
};

module.exports.isUInt16 = function(value) {
    return !(value > 0xffff);
};