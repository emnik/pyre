/*
 * I've connected the stove's thermostat cables to IN1 relay to NC (Normal Close) Position
 * That means:
 *  -  when GPIO is HIGH (1) the relay is open (ON regarding NC Connection)
 *  -  when GPIO is LOW (0) the relay is closed (OFF regarding NC Connection)
 *
 * RELAY IN1 GPIO 20 -> PIN 38 [thermostat]
 * RELAY IN2 GPIO 21 -> PIN 40 [power]
 */

var gpio = require('pi-gpio')
var config = require('../config.json')
var pin = config.pin

gpio.open(pin.thermostat, 'output', function (err) {
  if (err) {
    console.error(err)
  }
})

gpio.open(pin.power, 'output', function (err) {
  if (err) {
    console.error(err)
  }
})

function on (pin, callback) {
  gpio.write(pin, 0, function (err) {
    if (err) {
      callback(err)
    }
  })
}

function off (pin, callback) {
  gpio.write(pin, 1, function (err) {
    if (err) {
      callback(err)
    }
  })
}

function toggle (pin, callback) {
  gpio.read(pin, function (err, value) {
    if (err) {
      return callback(err)
    }
    if (value === 1) {
      on(pin, function (err) {
        if (err) {
          callback(err)
        }
      })
    } else {
      off(pin, function (err) {
        if (err) {
          callback(err)
        }
      })
    };
  })
}

function act (pin, state, callback) {
  gpio.read(pin, function (err, value) {
    if (err) {
      return callback(err)
    }
    if (value !== state) {
      toggle(pin, function (err) {
        callback(err)
      })
    }
  })
}

function close_pins(){
  const obj = config.pin
  for (var key in obj){
    // console.log(key)
    // console.log(obj[key])
    console.log('closing ' + key + ' in gpio:' + obj[key] + '...')
    gpio.close(obj[key])
  }
}

// module.exports.get = get;
// module.exports.on = on;
// module.exports.off = off;
// module.exports.toggle = toggle;
module.exports.act = act
module.exports.close_pins = close_pins
