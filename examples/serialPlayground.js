var ModbusSerialClient = require('../index').ModbusSerialClient;

var mserial = new ModbusSerialClient('COM1');

mserial.getAvailablePorts().then(function(ports){
    return mserial.connect().then(function(){
        console.log('CONNECTED');
        return mserial.readCoils(0, 10);
    });
}).catch(function(err){
    console.log(err);
    process.exit(-1);
}).then(function(){
    console.log('DONE');
});