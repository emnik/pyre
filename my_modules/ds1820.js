// Load node modules for sqlite and ds1820 file access
var sqlite3 = require('sqlite3').verbose();
var ds18b20 = require('ds18b20');
var db = new sqlite3.Database('/home/pi/apps/pyre/sensor-data.sqlite');

// Start local temperature logging
var msecs = (60 * 0.5) * 1000; // log interval duration in milliseconds - Now is set in 30000msec = 30sec = 1/2 min
logLocalTemp(msecs, function(err){
  if(err){
    console.error(err);
  }
});


// Read current temperature from local sensor
function readLocalTemp(insertfunc, callback){
  // ds18b20.temperature('28-000006b3513e', function(err, value) {
  ds18b20.temperature('28-00000704830c', function(err, value) {
   if (err){
       return callback(err);
    }
  var data = {
    // temperature_record:[{
      unix_time: Date.now(),
      celsius: Math.round(value * 10) / 10 //round temperature to 1 decimal digit
      // }]
    };

    // Send data to callback named insertfunc - actually insertLocalTemp!
    insertfunc(data, function(err){
      if(err){
        callback(err);
      }
    });
  });
};


// Write a single temperature record in JSON format to database table.
function insertLocalTemp(data, callback){
   // db.run("INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, 1, ?)",[data.temperature_record[0].unix_time, data.temperature_record[0].celsius], function(error){
   db.run("INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, 1, ?)",[data.unix_time, data.celsius], function(error){
     if (error){
       callback(error);
     }
   });
}


// Create a wrapper function which we'll use specifically for logging
function logLocalTemp(interval, callback){
      // Call the readTemp function with the insertLocalTemp function as output to get initial reading
      readLocalTemp(insertLocalTemp, function(error){
        return callback(error);
      });
      // Set the repeat interval (milliseconds). The insertLocalTemp below, is passed as an
      // argument to readLocalTemp (i.e. readLocalTemp(insertLocalTemp)).
      setInterval(readLocalTemp, interval, insertLocalTemp, function(error){
        if(error){
          callback(error);
        }
      });
};
