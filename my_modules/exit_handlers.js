
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.cached.Database('./sensor-data.sqlite');
var gpio = require("pi-gpio");
var async = require('async');
var config = require("../my_modules/config");
var pin = config.pin;


function close_pins(callback){
	console.log('\n');
	async.forEachOf(pin, function(value, key, innercallback){
		// I need async.forEachOf because if I use a simple Object.keys(pin).forEach() then after the
		// first itteration it triggers again the callback and this throws an error. The callback should be
		// triggered once after all the iterations are finished or when an error occurs
		// https://github.com/caolan/async#foreachofobj-iterator-callback  
		gpio.close(value, function(err){
			console.log("closing "+key+" in gpio:"+value+"...");
			if(err){
				innercallback(err);
			}
			else
			{
				innercallback(null);
			}
		})
	}, function(err){
		if(err){
			callback(err);
		}
		else
		{
			callback(null);
		}
	})
}

function close_database(callback){
  	db.close(function(err){
  		console.log("closing database...");
  		if(err){
  			return callback(err);
  		}
  		else
  		{
  			callback(null);
  		}
  	});
}


function gracefulExit(){
  //When I close node (CTRL+C) I should close the pins and database!
  async.series([
    function(callback){
        close_pins(function(err){
        if(err){
          callback(err,null);
        }
        else
        {
          callback(null,null); //@params: err,result   
        }
      }) 
    },
    function(callback){
        close_database(function(err){
        if(err){
          console.error(err);
          callback(err,null);
        }
        else
        {
          callback(null,null); //@params: err,result
        }
      })
    }
  ],function(error,result){
      if(error){
        for (var i = error.length - 1; i >= 0; i--) {
          console.error(error[i])
        };
        process.exit(1);  //exit code 1 = error but we exit anyway!
      }
      else
      {
        // for (var i = result.length - 1; i >= 0; i--) {
        //   console.log(result[i]);
        // }
        console.log('Done!');
        process.exit(0);  //exit code 0 = success
      };

    })  
}


// module.exports.close_pins = close_pins;
// module.exports.close_database = close_database;
module.exports.gracefulExit = gracefulExit;