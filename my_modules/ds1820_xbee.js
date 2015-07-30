var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');
var sqlite3 = require('sqlite3').verbose();


function readRemoteTemp(callback)
{
  var xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 2, //ATAP2
    module: "802.15.4",
    raw_frames: false
  });


  var serialport = new SerialPort("/dev/ttyAMA0", {
    baudrate: 9600,
    parser: xbeeAPI.rawParser()
  });


  xbeeAPI.on("frame_object", function(frame) {
  	//console.log(frame);
    if (frame.remote16 === '0002') // this is the address of the remote Xbee
    {
      var buf = new Buffer(4);
      buf = frame.data;
      //console.log(buf);
      //var buf = frame.data;
      var value = buf.readFloatLE(0);
      //console.log(value);
      var data = {
        temperature_record:[{
        unix_time: Date.now(),
        celsius: Math.round(value * 10) / 10 //round temperature to 1 decimal digit
        }]};
      if (data.temperature_record[0].celsius!=""){
        callback(data);
      }
    }
  })
}


  // Write a single temperature record in JSON format to database table.
  function insertRemoteTemp(data){
     var db = new sqlite3.Database('./sensor-data.sqlite');
     // data is a javascript object
     var statement = db.prepare("INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, 2, ?)");
     // Insert values into prepared statement
     statement.run(data.temperature_record[0].unix_time, data.temperature_record[0].celsius, function(error){
       if (error){
         console.log("SQL error from xbee module: ");
         console.log(error);
       }
     });
     // Execute the statement
     statement.finalize();
     db.close();
  }


  function logRemoteTemp(){
    readRemoteTemp(insertRemoteTemp);
  }

module.exports.logRemoteTemp = logRemoteTemp;
