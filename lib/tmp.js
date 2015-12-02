var net = require('net');
var client = net.connect({port: 502, host:'192.168.10.2'}, function() { //'connect' listener
    console.log('connected to server!');
    //var pdu = [0x01, 0x00, 0x13, 0x00, 0x13];
    var header = new Buffer([0x00, 0xFF, 0x00, 0x00, 0x00, 0x06, 0x01]);
    var pdu = new Buffer([0x01, 0x00, 0x00, 0x00, 0x04]);

    var buffers = [header, pdu];
    var totalLength = 0;
    for (var i = 0; i < buffers.length; i++) {
        totalLength += buffers[i].length;
    }

    var finalBuffer = Buffer.concat(buffers, totalLength);
    //console.log(b)
    var res = client.write(finalBuffer);
});

client.on('close', function(err) {
    console.log('closed');
});

client.on('drain', function(err) {
    console.log('drained');
});

client.on('error', function(err) {
    console.log(err);
});

client.on('data', function(data) {
    console.log(data);
});

client.on('end', function() {
    console.log('disconnected from server');
});