
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');
var gpio = require("pi-gpio");
var config = require("../my_modules/config");
var pin = config.pin;


function close_pins(callback){
	Object.keys(pin).forEach(function(num) {
		gpio.close(pin[num], function(err){
			if(err){
				console.error(err);
				callback(err);
			}
			else
			{
				callback(null);
			}
		})
	})
}

function close_database(callback){
  	db.close(function(err){
  		if(err){
  			console.error(err);
  			callback(err);
  		}
  		else
  		{
  			callback(null);
  		}
  	});
}

module.exports.close_pins = close_pins;
module.exports.close_database = close_database;