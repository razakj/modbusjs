var ModbusTcp = require('../lib/modbustcp');

var mtcp = new ModbusTcp('ifloodlights.eairlink.com', 502, {debug: true});

mtcp.on('error', function(e){
    console.log(e);
    process.exit(0);
});

mtcp.connect(function(){
    // Test Read Coils
    mtcp.readCoils(0, 2010, function (err, data, request, response) {
        if(err) {
            console.log(err);
        } else {
            console.log(response);
        }
    });
    mtcp.readInputs(0, 5, function (err, data, request, response) {
        if(err) {
            console.log(err);
        } else {
            console.log(response);
        }
    });
    mtcp.readHoldingRegisters(290, 126,function (err, data, request, response) {
        if(err) {
            console.log(err);
        } else {
            console.log(response);
        }
    });
});