  // Load node modules for sqlite and ds1820 file access
  var fs = require('fs');
  var sys = require('sys');
  var sqlite3 = require('sqlite3').verbose();
  var ds18b20 = require('ds18b20');
  var db = new sqlite3.Database('./sensor-data.sqlite');

  // Setup up database CRUD and temperature data access

  // Write a single temperature record in JSON format to database table.
  function insertLocalTemp(data, callback){
     //var db = new sqlite3.Database('./sensor-data.sqlite');
     // data is a javascript object
     db.run("INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, 1, ?)",[data.temperature_record[0].unix_time, data.temperature_record[0].celsius], function(error){
       if (error){
         callback(error);
       }      
     });
  }


  // Read current temperature from local sensor

  function readLocalTemp(insertfunc, callback){
    ds18b20.temperature('28-000006b3513e', function(err, value) {
     if (err){
         return callback(err);
      }
    var data = {
      temperature_record:[{
        unix_time: Date.now(),
        celsius: Math.round(value * 10) / 10 //round temperature to 1 decimal digit
        }]
      };

      // Execute call back with data
      insertfunc(data, function(err){
        if(err){
          callback(err);
        }
      });
    });
  };


  // Create a wrapper function which we'll use specifically for logging
  function logLocalTemp(interval, callback){
        // Call the readTemp function with the insertLocalTemp function as output to get initial reading
        readLocalTemp(insertLocalTemp, function(error){
          return callback(error);
        });
        // Set the repeat interval (milliseconds). Third argument is passed as callback function to first (i.e. readTemp(insertLocalTemp)).
        setInterval(readLocalTemp, interval, insertLocalTemp, function(error){
          if(error){
            callback(error);
          }
        });
  };


// export logTemp and readLocalTemp functions to app
module.exports.logLocalTemp = logLocalTemp;
module.exports.readLocalTemp = readLocalTemp;
