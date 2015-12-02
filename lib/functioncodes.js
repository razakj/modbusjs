module.exports = {
    0x01 : {
        handler: function(request, response) {
            var result = [];
            var totalCount = 0;
            for (var i = 0; i < response.dataLength; i++) {
                for (var e = 0; e < 8 && totalCount < request.length; e++) {
                    result.push((response.dataBuffer[i] & (1 << e)) > 0);
                    totalCount++;
                }
            }
            return result
        }
    }
};