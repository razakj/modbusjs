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
    var promises = [];
    promises.push(mtcp.readCoils(0, 20));
    promises.push(mtcp.readDiscreteInputs(0, 10));
    promises.push(mtcp.readHoldingRegisters(290, 7));
    promises.push(mtcp.readHoldingRegisters(290, 2, {unsigned: true}));
    promises.push(mtcp.readInputgRegisters(0, 10));
    Promise.all(promises).then(function(results){
        results.forEach(function(result){
            console.log(result.response);
        });
        exit();
    }).catch(function(err){
        console.log(err);
        exit();
    });
    //mtcp.writeMultipleCoilsSameValue(21, 1700, false).then(function(res){
    //    console.log(res);
    //    exit();
    //}).catch(function(err){
    //    console.log(err);
    //    exit();
    //})
}).catch(function(err){
    console.log(err);
    exit();
});

function exit() {
    mtcp.disconnect().then(function(){
        console.log('DISCONNECTED - PROMISED');
    }).catch(function(err){
        console.log(err);
    });
}