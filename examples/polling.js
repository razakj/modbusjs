var ModbusTcpClient = require('../index').ModbusTcpClient;

var mtcp = new ModbusTcpClient('192.168.146.2', 502, {autoReconnect: true, autoReconnectInterval: 5});

mtcp.on('error', function(err){
    console.log(err);
});

mtcp.on('reconnect', function(){
    console.log('RECONNECTED');
});

mtcp.connect().then(function(){
    execute(0);
}).catch(function(err){
    process.exit();
});

function execute(r) {
    if(mtcp.isConnected()) {
        var r = r + 1;
        var promises = [];
        promises.push(mtcp.readCoils(0, 10));
        promises.push(mtcp.readDiscreteInputs(0, 10));
        promises.push(mtcp.readHoldingRegisters(290, 10));
        promises.push(mtcp.readHoldingRegisters(290, 10, {unsigned: true}));
        promises.push(mtcp.readInputgRegisters(0, 10));
        Promise.all(promises).then(function(results){
            console.log("REQUEST "+r);
            results.forEach(function(result){
                console.log(JSON.stringify(result.result));
            });
        }).catch(function(err){
            console.log("REQUEST "+r);
            console.log(err);
        });
    }
    setTimeout(function(){execute(r)}, 500);
}