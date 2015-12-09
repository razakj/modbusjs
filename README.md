# ModbusJS
[![Build Status](https://travis-ci.org/razakj/modbusjs.svg?branch=master)](https://travis-ci.org/razakj/modbusjs)
[![NPM Version](https://img.shields.io/npm/v/gm.svg?style=flat)](https://www.npmjs.com/package/modbusjs)
## Overview
Modbus communication library for NodeJS using promises. 
## Status
The library is under active development and i keep adding functionality as well as possibly changing already implemented functionality if required. However i'll try to keep already implemented and working interfaces unchanged.

Currently implemented and working functionality :

*   ModbusTcpClient - Modbus client (master) for communication over TCP 
    *   readCoils
    *   readDiscreteInputs
    *   readHoldingRegisters
    *   readInputRegisters
    *   writeSingleCoil
    *   writeSingleRegister
    *   writeMultipleCoils
    *   writeMultipleCoilsSameValue
    *   writeMultipleRegisters
    *   writeMultipleRegistersSameValue

## Installation
```javascript
npm install modbusjs
```
## Usage
ModbusJS is using ES6 Promises (thus no 3rd party promise module dependency) to handle read/write requests. On top of that events are implemented as well for connection handling.
### ModbusTcpClient
```javascript
var ModbusTcpClient = require('modbusjs').ModbusTcpClient;
```
#### constructor

Returns a new instance of ModbusTcpClient. Connection is not established at this point.

**function(host, port[,options])**

*   host: IP address or DNS name of modbus server
*   port: Port of modbus server (usually 502)
*   options: Optional
    *   debug: Turn on debugging messages printed out to console. Default value is *FALSE*.
    *   autoReconnect: Automatic reconnect in case connection is lost. Default value is *FALSE*.
    *   autoReconnectInterval: Interval before trying to reconnect in seconds. Default values is *10*.

**example**
```javascript
var modbusTcpClient = new ModbusTcpClient('localhost', 502, {debug: true, autoReconnect: true, autoReconnectInterval: 5})
```

#### connect

Tries to establish communication with target modbus server. Triggers *error* event in case of error and *connect* if successful.

**example**

```javascript
modbusTcpClient.connect().then(function(){
    // Success
}).catch(function(err){
    // Error
});
```

#### disconnect

Destroys TCP socket if active and runs several clean up procedures. Triggers *disconnect* event if successful.

**example**

```javascript
modbusTcpClient.disconnect().then(function(){
    // Success
}).catch(function(err){
    // Error (ie. no active connection)
});
```

#### reconnect

Tries to reconnect to target modbus server. Triggers *reconnect* event if successful.

**example**

```javascript
modbusTcpClient.reconnect().then(function(){
    // Success
}).catch(function(err){
    // Error
});
```

#### isConnected

Returns current connection status.

```javascript
var connectionStatus = modbusTcpClient.isConnected();
```

#### readCoils

Reads coils from the modbus server. Maximum number of coils which can be read in one transaction is 2000.

**function(address, length[,options])**

**Input parameters**
*   address: Starting coil address
*   length: Number of coils to read
*   options: Optional
    *   timeout: Request timeout. Default value is *5* seconds.

**Result**
*   result: Array of booleans
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.readCoils(0, 10).then(function(result){
    // Success
}).catch(function(err){
    // Error
});
```

#### readDiscreteInputs

Reads inputs from the modbus server. Same interface and return values as *readCoils*.

**example**

```javascript
modbusTcpClient.readDiscreteInputs(0, 10).then(function(result){
    /// Success
}).catch(function(err){
    // Error
});
```

#### readHoldingRegisters

Reads holding registers from modbus server. Maximum number of registers which can be read in one transaction is 125.

**function(address, length[,options])**

**Input parameters**
*   address: Starting register address
*   length: Number of registers to read
*   options: Optional
    *   timeout: Request timeout. Default is *5* seconds.
    *   unsigned: By default all the results are read as signed. If this options is TRUE then unsigned conversion will be used instead.

**Result**
*   result: Array of (U)Int16
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.readHoldingRegisters(0, 10).then(function(result){
    // Success
}).catch(function(err){
    // Error
});
```

#### readInputgRegisters

Reads input registers from the modbus server. Same interface and return values as *readHoldingRegisters*.

**example**

```javascript
modbusTcpClient.readInputgRegisters(0, 10).then(function(result){
    // Success
}).catch(function(err){
    // Error
});
```

#### writeSingleCoil

Writes single coil value. 

**function(address, value[,options])**

**Input parameters**
*   address: Coil address
*   value: Valid values are *true/false* and *1/0*
*   options: Optional
    *   timeout: Request timeout. Default is *5* seconds.

**Result**
*   result: Echoed value from the request
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.writeSingleCoil(6, 0).then(function(res){
    // Success
}).catch(function(err){
    // Error
})
```

#### writeSingleRegister

Writes single register value. 

**function(address, value[,options])**

**Input parameters**
*   address: Register address
*   value: Maximum value is 0xFFFF.
*   options: Optional
    *   timeout: Request timeout. Default is *5* seconds.

**Result**
*   result: Echoed value from the request
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.writeSingleRegister(1, 123).then(function(res){
    // Success
}).catch(function(err){
    // Error
})
```

#### writeMultipleCoils

Writes multiple coils in one transaction.

**function(address, values[,options])**

**Input parameters**
*   address: Starting coil address
*   values: Array of booleans (or 0/1) to be written to the server starting from starting address.
*   options: Optional
    *   timeout: Request timeout. Default is 5 seconds.

**Result**
*   result: Number of updated output coils
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.writeMultipleCoils(1, [true, false, false, true, 0, 0, 1]).then(function(res){
    // Success
}).catch(function(err){
    // Error
})
```

#### writeMultipleCoilsSameValue

Just a helper with a same functionality as *writeMultipleCoils* providing function for cases when the value is same for the 
whole bulk of coils.

**function(address, length, value[,options])**

**Input parameters**
*   address: Starting coil address
*   length: Number of coils to be updated
*   value: Boolean (or 0/1) value to be written to [address, address + length] interval.
*   options: Optional
    *   timeout: Request timeout. Default value is *5* seconds.

**Result**
*   result: Number of updated output coils
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.writeMultipleCoilsSameValue(1, 20, true).then(function(res){
    // Success
}).catch(function(err){
    // Error
})
```

#### writeMultipleRegisters

Writes multiple registers in one transaction.

**function(address, values[,options])**

**Input parameters**
*   address: Starting register address
*   values: Array of UInt16 to be written to the server starting from the starting address.
*   options: Optional
    *   timeout: Request timeout. Default is 5 seconds.

**Result**
*   result: Number of output registers
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.writeMultipleRegisters(1, [1,2,3,4,5,6,7,8]).then(function(res){
    // Success
}).catch(function(err){
    // Error
})
```

#### writeMultipleRegistersSameValue

Just a helper with a same functionality as *writeMultipleRegisters* providing function for cases when the value is same for the 
whole bulk of registers.

**function(address, length, value[,options])**

**Input parameters**
*   address: Starting register address
*   length: Number of registers affected
*   value: UInt16 value to be written to [address, address + ] interval.
*   options: Optional
    *   timeout: Request timeout. Default is 5 seconds.

**Result**
*   result: Number of output registers
*   request: Request object
*   response: Response object

**example**

```javascript
modbusTcpClient.writeMultipleRegistersSameValue(1, 20, 666).then(function(res){
    // Success
}).catch(function(err){
    // Error
})
```

#### Events

##### connect

Emitted when successfully connected to the modbus server.

```javascript
modbusTcpClient.on('connect', function(err){
    console.log('CONNECTED - EVENT');
});
```

##### error

Emitted when network (socket) error occurs.

```javascript
modbusTcpClient.on('error', function(err){
    console.log('ERROR - ' + err);
});
```

##### disconnect

Emitted when the connection is lost. (not emitted during reconnection)

```javascript
modbusTcpClient.on('disconnect', function(){
    console.log('DISCONNECTED - EVENT');
});
```

##### reconnect

Emitted when successfully reconnected to the modbus server

```javascript
modbusTcpClient.on('disconnect', function(){
    console.log('DISCONNECTED - EVENT');
});
```

#### Examples
All the examples can be found in *examples* folder or above per individual functions.
*  [example-polling](https://github.com/razakj/modbusjs/blob/master/examples/polling.js)
*  [example-connection](https://github.com/razakj/modbusjs/blob/master/examples/connection.js)

Examples can triggered via npm however IP address of modbus server might have to be modified directly in the file (default *localhost*)
```javascript
npm run [example-name]
```
