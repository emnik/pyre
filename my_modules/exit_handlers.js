
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

module.exports.close_pins = close_pins;
module.exports.close_database = close_database;