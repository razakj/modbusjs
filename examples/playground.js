var ModbusTcpClient = require('../index').ModbusTcpClient;

var mtcp = new ModbusTcpClient('localhost', 502, {debug: true});

mtcp.on('connect', function(err){
    console.log('CONNECTED - EVENT');
}).on('error', function(err){
    console.log('ERROR - ' + err);
});

mtcp.on('disconnect', function(){
    console.log('DISCONNECTED - EVENT');
});

mtcp.connect().then(function(){
    mtcp.readCoils(0, 20).then(function(res){
        console.log(res.result);
        mtcp.reconnect().then(function(){
            console.log('DISCONNECTED - PROMISE')
        }).catch(function(err){
            console.log('E ' + err);
        });
    })
}).catch(function(err){
    console.log(err);
});

function execute(r) {
    var promises = [];
    promises.push(mtcp.readCoils(0, 1000));
    promises.push(mtcp.readDiscreteInputs(0, 10));
    promises.push(mtcp.readHoldingRegisters(290, 100));
    promises.push(mtcp.readHoldingRegisters(290, 50, {unsigned: true}));
    promises.push(mtcp.readInputgRegisters(0, 30));
    Promise.all(promises).then(function(results){
        console.log("REQUEST "+r);
        console.log("===============");
        results.forEach(function(result){
            console.log(JSON.stringify(result.result));
        });
    }).catch(function(err){
        console.log(err);
    });
    setTimeout(function(){execute(r+1)}, 500);
}