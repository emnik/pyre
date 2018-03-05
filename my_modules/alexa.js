// This is the amazon alexa support for pyre thermostat, powered by sinric alexa smart home skill!
const WebSocket = require('ws')
const token = '3786e9ec-2ba1-43ce-85cc-02637f0c5223'
const thermostatId = '5a99d846b950f610a7e65f75'
const options = {
  headers: {
    // Buffer below is needed so that we can convert the string to base64
    // needs node.js version >= 5.10.0 for this to work as Buffer.from() is added at that milestone!
    // https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_string_encoding
    'Authorization': Buffer.from('apikey:' + token).toString('base64')
  }
}

const ws = new WebSocket('ws://iot.sinric.com', options)

ws.on('open', function open () {
  console.log('Connected to sinric. Waiting for amazon alexa\'s commands..')
})

ws.on('message', function incoming (data) {
  console.log(data)
  var jsonData = JSON.parse(data)
  if (jsonData.deviceId === thermostatId) {
    if (jsonData.action === 'setPowerState') {
      // command: "Alexa turn ON thermostat"
      // {"deviceId":"5a99d846b950f610a7e65f75","action":"setPowerState","value":"ON"}
      // command: "Alexa turn OFF thermostat"
      // {"deviceId":"5a99d846b950f610a7e65f75","action":"setPowerState","value":"ON"}
      if (jsonData.value === 'ON') {
        console.log('Turning ON thermostat...')
      } else {
        console.log('Turning OFF thermostat...')
      }
    } else {
      if (jsonData.action === 'SetTargetTemperature') {
        // command: "Alexa set thermostat to 20"
        // {"deviceId":"5a99d846b950f610a7e65f75","action":"SetTargetTemperature","value":{"targetSetpoint":{"value":20,"scale":"CELSIUS"}}}
        var targetData = jsonData.value
        var targetSetpoint = targetData.targetSetpoint
        var value = targetSetpoint.value
        var scale = targetSetpoint.scale
        console.log('thermostat is set to ' + value + ' ' + scale)
      } else {
        if (jsonData.action === 'AdjustTargetTemperature') {
          // RAISE TEMPERATURE:
          // command: "Alexa make thermostat warmer"
          // {"deviceId":"5a99d846b950f610a7e65f75","action":"AdjustTargetTemperature","value":{"targetSetpointDelta":{"value":1,"scale":"CELSIUS"}}}
          // command: "Alexa increase thermostat 2 degrees"
          // {"deviceId":"5a99d846b950f610a7e65f75","action":"AdjustTargetTemperature","value":{"targetSetpointDelta":{"value":2,"scale":"CELSIUS"}}}
          // LOWER TEMPERATURE
          // command: "Alexa make thermostat cooler"
          // {"deviceId":"5a99d846b950f610a7e65f75","action":"AdjustTargetTemperature","value":{"targetSetpointDelta":{"value":-1,"scale":"CELSIUS"}}}
          // command: "Alexa decrease thermostat 3 degrees"
          // {"deviceId":"5a99d846b950f610a7e65f75","action":"AdjustTargetTemperature","value":{"targetSetpointDelta":{"value":-3,"scale":"CELSIUS"}}}
          var adjustTargetData = jsonData.value
          var targetSetpointDelta = adjustTargetData.targetSetpointDelta
          var deltaValue = targetSetpointDelta.value
          var deltaScale = targetSetpointDelta.scale
          console.log('thermostat is changing by ' + deltaValue + ' ' + deltaScale)
        } else {
          if (jsonData.action === 'SetThermostatMode') {
            // command: "Alexa set thermostat mode to AUTO"
            // other possible modes are: "COOL", "ECO", "HEAT" and "OFF"
            // {"deviceId":"5a99d846b950f610a7e65f75","action":"SetThermostatMode","value":{"thermostatMode":{"value":"AUTO"}}}
            var thermostatModeData = jsonData.value
            var thermostatMode = thermostatModeData.thermostatMode
            var modeValue = thermostatMode.value
            console.log('thermostat mode is set to ' + modeValue)
          }
        }
      }
    }
  }
})
