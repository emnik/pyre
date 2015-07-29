/*
* I've connected the stove's thermostat cables to IN1 relay to NC (Normal Close) Position
* That means:
*  -  when GPIO is HIGH (1) the relay is open (ON regarding NC Connection)
*  -  when GPIO is LOW (0) the relay is closed (OFF regarding NC Connection)
*
* RELAY IN1 GPIO 20 -> PIN 38 [thermostat]
* RELAY IN2 GPIO 21 -> PIN 40 [power]
*/

var gpio = require("pi-gpio");
var config = require("../my_modules/config");
var pin = config.pin;

gpio.open(pin.thermostat, "output");
gpio.open(pin.power, "output");

// function get(pin, callback){
//   gpio.read(pin, function(err, value) {
//       if(err)
//       {
//           console.log(err);
//           process.exit(1);
//       }
//     	if (value==0) status='OFF'
//     	else status='ON';
//     	console.log(value, status); // The current state of the pin
//       callback = status;
//     })
// }

function on(pin){
	gpio.write(pin, 1);
}

function off(pin){
	gpio.write(pin, 0);
}

function toggle(pin){
  gpio.read(pin, function(err, value) {
      if(err)
      {
          console.log(err);
          process.exit(1);
      }
      if (value==0) {on(pin)} else {off(pin)};
    })
}

function act(pin, state){
  gpio.read(pin, function(err, value) {
      if(err)
      {
          console.log(err);
          process.exit(1);
      }
      if (value!=state) {toggle(pin)};
    })
}


process.on('SIGINT', function(){
//When I close node (CTRL+C) I close the pins too!
  gpio.close(pin.thermostat);
  gpio.close(pin.power);
  console.log("Relay gpio pins have been closed!");
  process.exit();
})


// module.exports.get = get;
// module.exports.on = on;
// module.exports.off = off;
// module.exports.toggle = toggle;
module.exports.act = act;
