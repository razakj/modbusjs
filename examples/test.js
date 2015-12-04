var ModbusTcpClient = require('../index').ModbusTcpClient;

var mtcp = new ModbusTcpClient('192.168.146.2', 502, {debug: true});

mtcp.on('connect', function(err){
    console.log('CONNECTED - EVENT');
});

mtcp.on('error', function(err){
    console.log('ERROR - ' + err);
});

mtcp.on('disconnect', function(){
    console.log('DISCONNECTED - EVENT');
});

mtcp.connect().then(function(){
    //execute(1);
    mtcp.writeMultipleRegistersSameValue(290, 10, 5).then(function(res){
        console.log(res);
    }).catch(function(err){
        console.log(err);
        exit();
    });
}).catch(function(err){
    console.log(err);
    exit();
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

function exit() {
    mtcp.disconnect().then(function(){
        console.log('DISCONNECTED - PROMISED');
    }).catch(function(err){
        console.log(err);
    });
}