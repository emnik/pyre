// This is the amazon alexa support for pyre thermostat, powered by sinric alexa smart home skill!
const WebSocket = require('ws')
const token = '3786e9ec-2ba1-43ce-85cc-02637f0c5223'
const thermostatId = '5a99d846b950f610a7e65f75'
const options = {
  headers: {
    'Authorization': Buffer.from('apikey:' + token).toString('base64')
  }
}

const ws = new WebSocket('ws://iot.sinric.com', options)

ws.on('open', function open () {
  console.log('Connected. waiting for commands..')
})

ws.on('message', function incoming (data) {
  console.log(data)
  var jsonData = JSON.parse(data)
  for (var key in jsonData) {
    // console.log('key:' + key + ', value:' + jsonData[key])
    if (key === 'deviceId' && jsonData[key] === thermostatId) {
      console.log('this is it!')
    }
  }
})
