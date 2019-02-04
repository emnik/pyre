// Load node modules for sqlite and ds1820 file access
var sqlite = require('../my_modules/sqliteAsync')
var ds18b20 = require('ds18b20')
var fs = require('fs')
// const config = require('../config.json')



console.log('checking local sensor ID configuration...');
checkLocalSensor();

// var id = config.localSensorID;
// console.log("local sensor ID = "+id);
// checkSensorID(id);

// async function checkSensorID(localID){
//   var sensorID = await getSensorID();
//   if (localID==undefined || localID!=sensorID[0]){
//     if (localID==undefined){
//       console.log('local sensor configuration is not found!');
//     }
//     else {
//       console.log('local sensorID mismatch detected!'); //this will happen if the user change/replace the on board temp sensor.
//     }
//     var data = config;
//     data.localSensorID = sensorID[0];
//     try {
//       fs.writeFileSync('/home/pi/apps/pyre/config.json',  JSON.stringify(data), 'utf8');
//       console.log('local sensor configuration updtated successfully!')
//       }
//     catch(e) {
//       console.error(e);
//       console.error('local sensor configuration FAILED');
//       }   
//   }
// }

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


async function checkLocalSensor(){
  try {
    var sensorID = await getSensorID();
    var uid = sensorID[0];
    var rows = await sqlite.allAsync('SELECT * FROM sensors WHERE type = "OnBoard" LIMIT 1;');
    // console.log(rows)
    if (rows.length === 0) { // New on board sensor! Just Insert it in the sensor table and mark it's status as disabled. The user has first to set location and enable it.
      console.log('new onBoard sensor with uid='+uid)
      var name = 'DS18B20-onBoard'
      var sqlInsert = "INSERT INTO sensors (type, name, location, uid, status, preset, priority) VALUES ('onBoard','" + name + "','Thermostart','" + uid+ "', 1, 1, 5);"
      var lastID = await sqlite.runAsync(sqlInsert)
      console.log('We have a new on board temp sensor, with uid: ' + uid + ' which is now registered (enabled and set as default)')
      start(uid, lastID)
    }
    else if(rows[0].uid == uid){
      console.log('on Board sensor check OK!');
      start(uid, rows[0].id)
    } else {
      var sqlUpdate1 = "UPDATE sensors SET status=0 WHERE uid='" + rows[0].uid + "';";
      var sqlUpdate2 = "UPDATE sensors SET preset=0;";
      await sqlite.runAsync(sqlUpdate1)
      await sqlite.runAsync(sqlUpdate2)
      console.log('The onBoard sensor is changed. The previous one is set to disabled!')
      var name = 'DS18B20-onBoard'
      var sqlInsert = "INSERT INTO sensors (type, name, location, uid, status, preset, priority) VALUES ('onBoard','" + name + "','Thermostat','" + uid+ "', 1, 1, 5);"
      var lastID = await sqlite.runAsync(sqlInsert)
      console.log('We have a new on board temp sensor, with uid: ' + uid + ' which is now registered (enabled and set as default)')
      start(uid, lastID)
    }
  }
  catch (e) {
    console.err(e) // if we have no onBoard sensor ...?
  }
}



/****************************************
 **** Start local temperature logging ***
 ****************************************/


function start(uid, sensor_id){
  var msecs = (60 * 0.5) * 1000 // log interval duration in milliseconds - Now is set in 30000msec = 30sec = 1/2 min
  console.log('start temperature logging with on Board sensor: uid='+uid);
  setInterval(logLocalTemp,msecs,uid,sensor_id)
}


async function logLocalTemp(uid, id){
  var data = await readLocalTemp(uid);
  // console.log(data)
  var sql = "INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES ('" + data.unix_time +"', '" + id + "', '" + data.celsius +"');"
  sqlite.runAsync(sql)
}


// Read current temperature from local sensor
function readLocalTemp(uid){
  return new Promise(function (resolve, reject){
    ds18b20.temperature(uid, function (err, value) {
      if (err) {
        reject(err)
      }
      var data = {
        unix_time: Date.now(),
        celsius: Math.round(value * 10) / 10 // round temperature to 1 decimal digit
      }
      resolve(data)
    })
  })
}
  
