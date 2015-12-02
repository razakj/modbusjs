var ModbusTcp = require('../lib/modbustcp');

var mtcp = new ModbusTcp('192.168.10.2', 502, {debug: true});

mtcp.on('error', function(e){
    console.log(e);
    process.exit(0);
});

mtcp.connect(function(){
    // Test Read Coils
    mtcp.readCoils(21, 13, function (err, data, request, response) {
        if(err) {
            console.log(err);
        } else {
            console.log(response);
        }
        mtcp.disconnect(function(){
            process.exit(0);
        });
    });
});