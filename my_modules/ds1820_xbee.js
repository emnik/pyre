// var SerialPort = require('serialport').SerialPort; //Deprecated in serialport v.4
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite');

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2, //ATAP1 -with escape characters
  module: "802.15.4"
});


var serialport = new SerialPort("/dev/ttyAMA0", {
  // baudrate: 9600, //changed to baudRate in serialport v.4
  baudRate: 9600,
  parser: xbeeAPI.rawParser()
});



xbeeAPI.on("frame_object", function(frame) {
	// console.log(frame);
  var xbee_id = frame.remote16;
  var buf = frame.data;
  var value = buf.readFloatLE(0);
  var rssi = frame.rssi;
  // console.log(value);
  var data = {
    temperature_record:[{
    unix_time: Date.now(),
    celsius: Math.round(value * 10) / 10, //round temperature to 1 decimal digit
    uid: xbee_id,
    rssi: rssi
    }]};
  console.log(data);
  if (data.temperature_record[0].celsius!=""){
    // insertfunc(data, function(error){
    insertRemoteXbeeTemp(data, function(error){
      if (error){
        callback(error);
      }
    });
  }
})


// Write a single temperature record in JSON format to database table.
function insertRemoteXbeeTemp(data, callback){
  // console.log('storing new data in db...')
  db.all('SELECT id, status FROM sensors WHERE type = ? AND uid=? LIMIT 1', ['XBee S1', data.temperature_record[0].uid], function(err,row){
    if(err){
      return callback(err);
    }
    if(row.length==0){ //New remote sensor! Just Insert it in the sensor table and mark it's status as disabled. The user has first to set location and enable
      var name = "DS18B20-XBee-ID"+data.temperature_record[0].xbee_id;
      db.run("INSERT INTO sensors (type, name, uid, status, preset) VALUES ('XBee S1',?, ?, 0, 0)",[name, data.temperature_record[0].uid], function(err){
       if (err){
         callback(err);
       }
       console.log("We have a new temp sensor online with xbee id: "+data.temperature_record[0].uid+" which is now registered (but disabled) with id: "+this.lastID);
     });
    }
    else //existing sensor
    {
      if (row[0].status==1){ // if the existing sensor is enabled (status=1), then we store the data. else we ignore them!!!
        var sensor_id=row[0].id;
        db.run("INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, ?, ?)",[data.temperature_record[0].unix_time, sensor_id, data.temperature_record[0].celsius], function(err){
         if (err){
           callback(err);
         }
      })
     }
    }
  })
}
