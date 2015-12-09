var ModbusTcpClient = require('../index').ModbusTcpClient;

var modbusTcpClient = new ModbusTcpClient('localhost', 502);

modbusTcpClient.on('connect', function() {
    console.log('CONNECTED - Triggered by EventEmitter');
}).on('error', function(err){
    console.log('ERROR - Triggered by EventEmitter');
}).on('disconnect', function(){
    console.log('DISCONNECTED - Triggered by EventEmitter');
}).on('reconnect', function(){
    console.log('RECONNECTED - Triggered by EventEmitter');
});

modbusTcpClient.connect().then(function(){
    console.log('CONNECTED - Promised');
    return modbusTcpClient.disconnect().then(function(){
        console.log('DISCONNECTED - Promised');
        return modbusTcpClient.reconnect().then(function(){
            console.log('RECONNECTED - Promised');
        }).catch(function(err){
            console.log('Unable to reconnect - Promised')
        });
    }).catch(function(err){
        console.log('Unable to disconnect - Promised')
    });
}).catch(function(err){
    console.log('Unable to connect - Promised');
}).then(function(){
    process.exit(0);
});