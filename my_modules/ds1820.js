// Load node modules for sqlite and ds1820 file access
var sqlite3 = require('sqlite3').verbose()
var ds18b20 = require('ds18b20')
var db = new sqlite3.Database('/home/pi/apps/pyre/sensor-data.sqlite')
var fs = require('fs')
const config = require('../config.json')

var id = config.localSensorID;
console.log("local sensor ID = "+id);
console.log('checking local sensor ID configuration...');
checkSensorID(id);

async function checkSensorID(localID){
  var sensorID = await getSensorID();
  if (localID==undefined || localID!=sensorID[0]){
    if (localID==undefined){
      console.log('local sensor configuration is not found!');
    }
    else {
      console.log('local sensorID mismatch detected!'); //this will happen if the user change/replace the on board temp sensor.
    }
    var data = config;
    data.localSensorID = sensorID[0];
    try {
      fs.writeFileSync('/home/pi/apps/pyre/config.json',  JSON.stringify(data), 'utf8');
      console.log('local sensor configuration updtated successfully!')
      }
    catch(e) {
      console.error(e);
      console.error('local sensor configuration FAILED');
      }   
  }
}

function getSensorID(){
  return new Promise(function(resolve, reject){
    ds18b20.sensors(function (err, id) {
      if (err){
        console.error(err);
        reject(err);
      }
      else {
        sensorID = id;
        resolve(sensorID);
      }
    });
  })
}


  // Start local temperature logging
if (id!=undefined && id!=null){
  var msecs = (60 * 0.5) * 1000 // log interval duration in milliseconds - Now is set in 30000msec = 30sec = 1/2 min
  logLocalTemp(msecs, function (err) {
    if (err) {
      console.error(err)
    }
  })
}

// Read current temperature from local sensor
function readLocalTemp (insertfunc, callback) {
  ds18b20.temperature(id, function (err, value) {
    if (err) {
      return callback(err)
    }
    var data = {
      unix_time: Date.now(),
      celsius: Math.round(value * 10) / 10 // round temperature to 1 decimal digit
    }

    // Send data to callback named insertfunc - actually insertLocalTemp!
    insertfunc(data, function (err) {
      if (err) {
        callback(err)
      }
    })
  })
};

// Write a single temperature record in JSON format to database table.
function insertLocalTemp (data, callback) {
  db.run('INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, 1, ?)', [data.unix_time, data.celsius], function (error) {
    if (error) {
      callback(error)
    }
  })
}

// Create a wrapper function which we'll use specifically for logging
function logLocalTemp (interval, callback) {
  // Call the readTemp function with the insertLocalTemp function as output to get initial reading
  readLocalTemp(insertLocalTemp, function (error) {
    return callback(error)
  })
  // Set the repeat interval (milliseconds). The insertLocalTemp below, is passed as an
  // argument to readLocalTemp (i.e. readLocalTemp(insertLocalTemp)).
  setInterval(readLocalTemp, interval, insertLocalTemp, function (error) {
    if (error) {
      callback(error)
    }
  })
}
