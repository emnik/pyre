  // Load node modules for sqlite and ds1820 file access
  var fs = require('fs');
  var sys = require('sys');
  var sqlite3 = require('sqlite3').verbose();
  var ds18b20 = require('ds18b20');
  var db = new sqlite3.Database('./sensor-data.sqlite');

  // Setup up database CRUD and temperature data access



  // Write a single temperature record in JSON format to database table.
  function insertLocalTemp(data){
     //var db = new sqlite3.Database('./sensor-data.sqlite');
     // data is a javascript object
     var statement = db.prepare("INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, 1, ?)");
     // Insert values into prepared statement
     statement.run(data.temperature_record[0].unix_time, data.temperature_record[0].celsius, function(error){
       if (error){
         console.log("SQL error from ds1820 module: ");
         console.log(error);
       }
     });
     // Execute the statement
     statement.finalize();
     //db.close();
  }


  // Read current temperature from local sensor

  function readLocalTemp(callback){
    ds18b20.temperature('28-000006b3513e', function(err, value) {
     if (err){
         console.error(err);
         process.exit(1);
      }
    var data = {
      temperature_record:[{
      unix_time: Date.now(),
      celsius: Math.round(value * 10) / 10 //round temperature to 1 decimal digit
      }]};

      // Execute call back with data
      callback(data);
    });
  };


  // Create a wrapper function which we'll use specifically for logging
  function logLocalTemp(interval){
        // Call the readTemp function with the insertLocalTemp function as output to get initial reading
        readLocalTemp(insertLocalTemp);
        // Set the repeat interval (milliseconds). Third argument is passed as callback function to first (i.e. readTemp(insertLocalTemp)).
        setInterval(readLocalTemp, interval, insertLocalTemp);
  };


// export logTemp and readLocalTemp functions to app
module.exports.logLocalTemp = logLocalTemp;
module.exports.readLocalTemp = readLocalTemp;
