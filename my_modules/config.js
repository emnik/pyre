// GPIOs 20 & 21 are LOW on boot
var pin = {thermostat: 38, power: 40}
// pin 38 = GPIO 20
// pin 40 = GPIO 21

// GPIOs 29 & 31 are HIGH on boot
// var pin = {thermostat: 29, power: 31}
// pin 29 = GPIO 5
// pin 31 = GPIO 6

module.exports.pin = pin
