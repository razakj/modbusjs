var ModbusSerialClient = require('../index').ModbusSerialClient;

var mserial = new ModbusSerialClient('COM1');

mserial.getAvailablePorts().then(function(ports){
    return mserial.connect().then(function(){
        return mserial.readCoils(0, 2);
    });
}).catch(function(err){
    console.log(err);
    process.exit(-1);
}).then(function(data, request, response){
    console.log(data);
});