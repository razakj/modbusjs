module.exports.isUInt8 = function(value) {
    return !(value > 0xff);
};

module.exports.isUInt16 = function(value) {
    return !(value > 0xffff);
};

module.exports.isValidCoil = function(value) {
    return (typeof value === "boolean"
        || (typeof value === "number" || ([0,1].indexOf(value) > -1)));
};