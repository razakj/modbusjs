var ModbusTcpClient = require('../index').ModbusTcpClient;

var mtcp = new ModbusTcpClient('192.168.146.2', 502, {debug: true});

mtcp.on('connect', function(err){
    console.log('CONNECTED - EVENT');
}).on('error', function(err){
    console.log('ERROR - ' + err);
}).on('disconnect', function(){
    console.log('DISCONNECTED - EVENT');
});

mtcp.connect().then(function(){
    return mtcp.readCoils(0, 20).then(function(res){
        console.log(res.result);
    })
}).catch(function(err){
    console.log(err);
});