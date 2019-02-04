/* I get the data json object from initiate.js module as follows:
{
    tempdata: tempdata, // tempdata ={id, average}
    profiles: profiles, // profiles = 
    sensors: sensors,
    sensor_location: locations,
    default_sensor: default_sensor,
    time_window_data: time_window_data,
    state: state,
    time_window_next: time_window_next,
    curtime: curtime,
    status: workstatus
}

example:

{ 
    tempdata: [ { id: 1, average: 28 }, { id: 4, average: 24.3 } ], 
    // I always get temp data from the default sensor and all the sensors that are available. 
    // If a sensor is not available I will not get data for it... 
    // (in this case sensor 3 wasn't initially available!)
    profiles: 
    [ { id: 1, name: 'CONSTANT', status: 1 },
        { id: 2, name: 'DAYNIGHT', status: 0 },
        { id: 3, name: 'WEEKLY', status: 0 },
        { id: 4, name: 'CUSTOM', status: 0 } ],
    sensors: [ '3', '4' ],
    sensor_location: 
    [ { id: 3, location: 'KidsRoom' },
        { id: 4, location: 'Office' } ],
    default_sensor: 1,
    time_window_data: 
    [ { id: 2,
        name: 'CONSTANT_PROFILE',
        on_time: '00:00',
        off_time: '24:00',
        sensor_ids: '3,4',
        temp: 23.8 } ],
    state: { err: '' },
    time_window_next: {},
    curtime: '12:49',
    status: 'Paused' 
}

*/
var init = require('../my_modules/initiate')

/* Require the <config module> for the pin numbers and the <relay module> for the functions that control
the relays via the gpios. */
const config = require('../config.json')
const pin = config.pin
const hysteresis = parseFloat(config.thermostat.hysteresis)

var relay = require('../my_modules/relay')
var status = require('../my_modules/status')

//get db access (needed to save a setpoint originated from alexa!)
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite')

if (config.modules.sinric == 'enabled') {
    // load module alexa responsible for the amazon alexa support, powered via sinric smart home skill
    var alexa = require('../my_modules/alexa')
}

// load any global variables needed
var globals = require("../my_modules/globals")

// load module temperature responsible for getting the average temperature of each sensor from the database
var temperature = require('../my_modules/temperature')

// get access to the socket.io 
const server = require('../my_modules/server');
const socket = server.io

// LOCAL GLOBALS ;-)
// globals.overrideSchedule = false
var prevstate = ""
var overrideType = ""
var overrideEndTime = ""
var latestTempData = null
var curdate = new Date()
var curday = curdate.getDay()
var data = null
var target = null
var duration = 300 // the last x seconds of temperature data that we want to retrieve from the database

/**  
 *  Main thermostat's operation function:
 */

start()

setInterval(getTemp, 60000) // repeat every 1 min

function getTemp(){
    temperature.get_temp_data(duration, function (err, result) {
        if (err) {
          console.error(err)
        }
        else {
          curstate = onData(result) // send the temperature and sensor data to the main module
          latestTempData = result
          emitSocketIOData(result, curstate)
        }
      })
}


if (config.modules.sinric=='enabled'){
    setInterval(function () {
        var ambient = sensorsTempCalc(latestTempData)
        if (target!=null && target != undefined){
            alexa.manualTempUpdate(ambient.curtemp, target)
        }
      }, 180000) // repeat every 3 min
}



async function start(){
    console.log('Hello from main.start() function')
    data = await init.run()
    prevstate = data.status
    if (prevstate=="Away"){
        globals.away = true
    }
    console.log('the prevstate is: ' + prevstate)
    if (data!=null){
        if (data.state.err=="" && globals.overrideSchedule==false) {
            target = data.time_window_data[0].temp;
            latestTempData = data.tempdata
            if (config.modules.sinric == 'enabled') {
                alexa.manualTargetUpdate(target)
            }
            curstate = onData(data.tempdata)
            emitSocketIOData(data.tempdata, curstate)
        } else {
            getTemp(); //if not in a timewindow lets get at least the temperature data to start...
        }
    }
    return data
}


function emitSocketIOData(newtemp, newstatus){
    if(newtemp!=null){
        socket.emit("temperatures", newtemp) //emit the sensors data
    }

    if(newstatus!=null){
        socket.emit("curstate", {
            "curstate": newstatus,
            "override": globals.overrideSchedule,
            "overrideTarget": (globals.overrideSchedule ? target : null), 
            "overrideEndTime": (globals.overrideSchedule ? reportOverrideEndTime() : null)
        }) //emit the curstate and override state-temp
    }
}


function onData (tempdata) {
    if (!globals.away){
        console.log("Hi! I've got new temp data. Processing now...")
        var newData = sensorsTempCalc(tempdata) // {sensorIdStatus, curtemp, noData}
        console.log(newData.curtemp)
        var curstate = manage(newData.curtemp);
        if (curstate !== "Refresh"){
            console.log("The thermostat is: " + curstate)
            if (curstate != prevstate){ //only update the status in db if changed
                status.set_status(curstate)
                // setStatus(curstate)
            }
            setRelay(curstate) //always trigger the relay with the current state!
            return curstate
        }
        else {
            start()
        }
    }
    else {
        console.log("Away is set!!!")
        curstate = "Away"
        status.set_status(curstate)
        setRelay(curstate)
        return curstate
    }
}



function sensorsTempCalc(tempdata){
    //decides which sensors sent data (available) and which did not (unavailable) and calculates the average
    //temperature from the available data. If no data, the resulted temperature will be the one from the default
    //sensor
    var allfound=0;
    var sumtemp=0;
    var prioritySum=0;
    for (var i = data.sensors.length - 1; i >= 0; i--){
        for (var j = tempdata.length - 1; j >= 0; j--) {
            if(tempdata[j].id == data.default_sensor){
                var default_temp = tempdata[j].average; //default temp is used if all sensors (except the default) are offline !!!
            }
            if(data.sensors[i] == tempdata[j].id){
                allfound=allfound+1;
                sensor_found=1;
                prioritySum+=tempdata[j].priority;
                sumtemp = sumtemp + tempdata[j].average * tempdata[j].priority;
            }
        }
    }

    if(sumtemp!=0){
        var avgtemp = Math.round(sumtemp / prioritySum * 10)/10;
    }

    if(allfound==0){
        curtemp=default_temp //this is the first attempt... If the sensors are all remote, we might get data in a while...
    }
    else
    {
        curtemp=avgtemp
    }

    if (data.state.err==''){
        console.log('using average from live sensors')
        return {curtemp:curtemp}
    } else {
        console.log('using default sensor')
        return {curtemp:default_temp}
    }
    
}



function setRelay(curstate){
    var act
    if (curstate=="Paused" || curstate=="Away") act=0; else act=1
    relay.act(pin.thermostat, act, function (err) { // 0 = OFF
        if (err) {
            console.error(err)
        }
    })
    prevstate = curstate;
}

function getCurTime() {
    var d = new Date();
    var n = d.getDay();
    var h = d.getHours();
    var m = d.getMinutes();
    if (h<10) h="0"+h;
    if (m<10) m="0"+m;
    var curtime = h+":"+m;
    return {time:curtime, day:n};
}


function manage(curTemp){
    var cur = getCurTime();
    if (globals.overrideSchedule){
        if (overrideType=='timed'){
            if (cur.day>curday && overrideEndTime>"23:59"){
                var oT = overrideEndTime.split(':');
                var oH = parseInt(oT[0])-24;
                var oM = oT[1]
                var oHs = oH.toString();
                if (oHs<10) oHs="0"+oHs;
                overrideEndTime = oHs + ":" + oM;
                console.log(overrideEndTime)
            }
            if (cur.time < overrideEndTime) {
                console.log('in timed override until: '+ overrideEndTime)
                if (prevstate=="Working"){
                     if (curTemp >= target) {curstate = "Paused";} else {curstate = "Working";}
                }
                else {
                    if(curTemp+hysteresis <= target) {curstate = "Working";} else {curstate = "Paused";}
                }
            }
            else {
                globals.overrideSchedule = false; 
                curstate="Refresh";
            }
        }
        else if (overrideType == 'schedule') {
            if (data.state.err=="") { //true if there is no error so we are in a time window... 
                if (cur.time < data.time_window_data[0].off_time) {
                    console.log('in schedule override until '+ data.time_window_data[0].off_time)
                    if (prevstate=="Working"){ if (curTemp >= target){curstate = "Paused";} else {curstate = "Working";}}
                    else if(curTemp+hysteresis <= target){curstate = "Working";} else {curstate = "Paused";}
                }
                else {globals.overrideSchedule = false; curstate="Refresh";}
        } else if (data.state.err=="No_time_window") {
            if (Object.keys(data.time_window_next).length!==0) {//true if there is a following time window...
                if (cur.time < data.time_window_next.on_time && cur.day == curday){
                    if (prevstate=="Working"){ if (curTemp >= target){curstate = "Paused";} else {curstate = "Working";}}
                    else if(curTemp+hysteresis <= target){curstate = "Working";} else {curstate = "Paused";}
                }
                else {globals.overrideSchedule = false; curstate="Refresh";}
            } else if (cur.day == curday){
                    if (prevstate=="Working"){ if (curTemp >= target){curstate = "Paused";} else {curstate = "Working";}}
                    else if(curTemp+hysteresis <= target){curstate = "Working";} else {curstate = "Paused";}
                }
                else {globals.overrideSchedule = false; curstate="Refresh";}
                }
            
        }
        else if (overrideType == 'manual') {
            if (prevstate=="Working"){ if (curTemp >= target){curstate = "Paused";} else {curstate = "Working";}}
            else if(curTemp+hysteresis <= target){curstate = "Working";} else {curstate = "Paused";}
        }
    }
    else // no override!
    {
        if (data.state.err=="") //true if there is no error so we are in a time window...
        {
            if (cur.time >= data.time_window_data[0].on_time && cur.time < data.time_window_data[0].off_time)
            {
                if (prevstate=="Working"){
                    if (curTemp >= target) {curstate = "Paused";} else {curstate = "Working";}
                }
                else //prevstate=="Paused" or prevstate=="Away" or prevstate=="" Initial state - we just got data for the first time!
                {
                    if (curTemp+hysteresis <= target) {curstate = "Working";} else {curstate = "Paused";}
                }
            }
            else
            {
                //we just went off the time window so we refresh to get new data
                console.log('refresh');
                curstate="Refresh"
            }
        }
        else if (data.state.err=="No_time_window") //true if we are not in a time window...
        {
            console.log("Not in a time window...");
            curstate = "Paused";
            if (Object.keys(data.time_window_next).length!==0) //true if there is a following time window...
            {
                console.log("There is a following time window. Waiting...");
                //when we get in this following time window we refresh to update our data...
                if (cur.time >= data.time_window_next.on_time && cur.time < data.time_window_next.off_time) {
                    curstate="Refresh"
                }
                console.log("Or maybe the next day comes first!");
                if (cur.day > curday)
                {
                    curstate="Refresh"
                }
            }
            else //there is not a time window neither a following one so we refresh for new data on the next day!!!
            {
                console.log("There isn't a time window following. Will refresh on next day! Waiting...");
                curstate = "Paused";
                if (cur.day > curday)
                {
                    curstate="Refresh"
                }
            }
        }
        else //there is an Overlap!!!
        {
            curstate = "Paused";
            console.log("Do nothing - wait for the user to fix the overlap!!!");
        }
    }
    return curstate
}


/******* OVERRIDE SCHEDULE *******
 ******* RELATED FUNCTIONS *******/

function checkOverride(callback){
    curstate = onData(latestTempData)
    var data = {"curstate": curstate,
        "override": globals.overrideSchedule,
        "overrideTarget": (globals.overrideSchedule ? target : null), 
        "overrideEndTime": (globals.overrideSchedule ? reportOverrideEndTime() : null)
    }
    callback(data)
}

function setOverrideEndTime(deltaHours){
    var d = new Date();
    var n = d.getDay();
    var h = d.getHours();
    h += deltaHours;
    var m = d.getMinutes();
    if (h<10) h="0"+h;
    if (m<10) m="0"+m;
    var endTime = h+":"+m;
    return endTime;
}


function reportOverrideEndTime(){
    if(overrideType=='timed'){
        if (overrideEndTime>="23:59") {
            var oT = overrideEndTime.split(":");
            var oH = parseInt(oT[0])-24;
            if (oH<10) oH = "0" + oH;
            return (oH+":"+oT[1])
        }
        else {
            return overrideEndTime
        }
    } 
    else if (overrideType == 'manual') {
        return 'manually changed'
    }
    else if (overrideType=='schedule'){
        return 'next schedule'
    }
}

function overrideTarget(newtarget, option){
    console.log('newtarget=' + newtarget +' ,option=' + option);
    if (newtarget!=null){ //this is null when option='cancel' and there is not a valid timewindow
        target = parseFloat(newtarget)
         if (config.modules.sinric == 'enabled'){
            if (option != 'alexa'){
               alexa.manualTargetUpdate(target)
            }
        }
    }
    if (option == 'timed1'){
        overrideEndTime = setOverrideEndTime(2);
        overrideType = 'timed';
        globals.overrideSchedule = true;
    } 
    else if (option == 'timed2') {
        overrideEndTime = setOverrideEndTime(4);
        overrideType = 'timed';
        globals.overrideSchedule = true;
    } 
    else if (option == 'schedule') {
        overrideType = 'schedule';
        globals.overrideSchedule = true;
    }
    else if (option == 'manual') {
        overrideType = 'manual';
        globals.overrideSchedule = true;
    }
    else if (option == 'cancel') {
        console.log('target override is canceled!')
        overrideType = 'cancel';
        globals.overrideSchedule = false;
    } else if (option == 'alexa') {
        overrideType = 'schedule';
        globals.overrideSchedule = true;
    }

    curstate = onData(latestTempData)
    emitSocketIOData(null, curstate)
}



function awayToggle(){
    globals.away = !globals.away
    if (globals.away){
        curstate = "Away"
    }
    else {
        console.log(latestTempData)
        curstate = onData(latestTempData)
    }

    if (curstate != prevstate){
        status.set_status(curstate)
    }

    setRelay(curstate)
    emitSocketIOData(null, curstate)
}

/** 
 * ALEXA RELAED FUNCTIONS
 * deltaTarget: make thermostat warmer / cooler
 * 
**/

function deltaTarget(delta){ 
    delta = parseFloat(config.hysteresis)
    var newtarget = target+delta;
    overrideTarget(newtarget, 'schedule')
    console.log('target is overrided by Alexa to ' + newtarget + ' until next schedule!')
}


function sendSinricStatus(status){
    socket.emit('sinric', {
        status: status
      }) 
}

module.exports.start = start
module.exports.onData = onData
module.exports.overrideTarget = overrideTarget
module.exports.checkOverride = checkOverride
module.exports.deltaTarget = deltaTarget
module.exports.awayToggle = awayToggle
module.exports.sendSinricStatus = sendSinricStatus