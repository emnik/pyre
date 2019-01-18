/** This is the amazon alexa support for pyre thermostat, powered by sinric alexa smart home skill!
 *  Sinric does not implement all the thermostat functions supported by alexa
 *  Here I implement all the functions that sinric supports...
**/

var main = require('../my_modules/main')
var config = require('../config.json')

// load any global variables needed
var globals = require("../my_modules/globals")

const WebSocket = require('ws')

const token = config.sinric.token
const thermostatId = config.sinric.thermostatID

const options = {
  headers: {
    // Buffer below is needed so that we can convert the string to base64
    // needs node.js version >= 5.10.0 for this to work as Buffer.from() is added at that milestone!
    // https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_string_encoding
    'Authorization': Buffer.from('apikey:' + token).toString('base64')
  }
}



var ws=null
var targetBuf=null
var serverDown=false
const HEARTBEAT_INTERVAL = 120000 //2 minutes


CreateWebSocket()

function CreateWebSocket(){
  ws = new WebSocket('ws://iot.sinric.com', options)
  ws.on('open', open)
  ws.on('error', error)
  ws.on('message', incoming)
}


// Send heartbeat every 2 mins in order to avoid disconnections during ISP resetting IPs over night.
const interval = setInterval(function() {
    if (!serverDown){
      console.log("sending Heartbeat...")
      ws.send('H', function ack (err){
        if(err){
          console.error(err)
          reconnect()
        }
      })
    }
    else {
      console.log("Heartbeat is cancelled due to sinric server being down...")
    }
  }, HEARTBEAT_INTERVAL);


async function open(){
  console.log('Connected to sinric. Waiting for amazon alexa\'s commands..')
  serverDown = false
  if(targetBuf!==null){
    manualTargetUpdate(targetBuf)
    targetBuf=null
  } else {
    try {
      var target = await main.sendTargetTemp()
      manualTargetUpdate(target)
    }
    catch (e) {
      console.error(e)
    }
  }
}

function error(err){
  console.error(err.message)
  if (err.message === "Unexpected server response: 521"){ //status 521 means CloudFlare Server which hosts the sinric service is down... 
    serverDown=true
    console.log("Sinric server is currently down. Will try to reconnect in 4 minutes...")
    setTimeout(reconnect, 240000)
  }
  else {
    reconnect()
  }
}

function reconnect(){
  //TODO: maybe I should set a reconnect interval that gets canceled if the connection is made...
  //although this may not be needed in my case as I periodically send the Heartbeat and if it fails it will try to recoonect...
  if (ws.readyState===WebSocket.CLOSED){
    console.log("Try reoppening the websocket connection...")
    CreateWebSocket()
  }
}

function incoming (data) {
  console.log(data)
  var jsonData = JSON.parse(data)
  if (jsonData.deviceId === thermostatId) {
    if (jsonData.action === 'setPowerState') {
      // command: "Alexa turn ON thermostat"
      // {"deviceId":"5a99d846b950f610a7e65f75","action":"setPowerState","value":"ON"}
      // command: "Alexa turn OFF thermostat"
      // {"deviceId":"5a99d846b950f610a7e65f75","action":"setPowerState","value":"OFF"}
      if (jsonData.value === 'ON') {
        console.log('Setting AWAY Mode to FALSE...')
        if(globals.away != false){
          main.awayToggle(null)
        }
      } else {
        console.log('Setting AWAY Mode to TRUE...')
        if(globals.away != true){
          main.awayToggle(null)
        }
      }
      console.log(globals)
    } else {
      if (jsonData.action === 'SetTargetTemperature') {
        // command: "Alexa set thermostat to 20 degrees"
        // {"deviceId":"5a99d846b950f610a7e65f75","action":"SetTargetTemperature","value":{"targetSetpoint":{"value":20,"scale":"CELSIUS"}}}
        var targetData = jsonData.value
        var targetSetpoint = targetData.targetSetpoint
        var value = targetSetpoint.value
        var scale = targetSetpoint.scale
        main.updateTarget(value) // send the new target to main!
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
          main.deltaTarget(deltaValue) // send the new target to main!
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
}


function manualTargetUpdate(temp){
  console.log('updating Alexa with the new target temp: ' + temp)
  if(!serverDown){
    var wsdata = {"action":"SetTargetTemperature", "deviceId":thermostatId, "value":{"targetSetpoint":{"value":temp, "scale":"CELSIUS"}}}
    var jsonwsdata = JSON.stringify(wsdata)
    var buffer = Buffer.from(jsonwsdata)
    ws.send(buffer)
  }
  else {
    console.log("Sinric server is down... Cancelling target update for now.")
  }
}


function manualTempUpdate(ambient, target){
  if(!serverDown){
    console.log('updating Alexa with the new ambient temp: ' + ambient +' and target: ' + target)
    var wsdata = {"action":"SetTemperatureSetting", "deviceId":thermostatId, "value":{"temperatureSetting":{"setpoint":target, "scale":"CELSIUS", "ambientTemperature":ambient}}}
    var jsonwsdata = JSON.stringify(wsdata)
    var buffer = Buffer.from(jsonwsdata)
    ws.send(buffer)
  }
  else {
    console.log("Sinric server is down... Cancelling temp update for now.")
  }
}



function getTargetTemp(target){
  //as soon I get the target temp I send alexa the info!
  targetBuf = target
}


module.exports.manualTempUpdate = manualTempUpdate
module.exports.manualTargetUpdate = manualTargetUpdate
module.exports.getTargetTemp = getTargetTemp