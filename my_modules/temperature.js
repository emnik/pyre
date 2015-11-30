var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');
db.configure("busyTimeout", 2000);


function get_temp_data(duration, callback) {
	var sensors=[];

	db.each("SELECT sensor_id AS id, AVG(value) as average FROM sensor_data WHERE timestamp >= ? GROUP BY sensor_id;", (Date.now()-duration*1000), function (err, row) {
	    if (err){
	      console.error(err);
	      return callback(err, null);
	    };
	    sensors.push({id:row.id,average:(Math.round(row.average*10)/10)});
	   }, function(){
	   		// try {
			   //  var sum=0;
			   //  for (var i = sensors.length - 1; i >= 0; i--) {
			   //  	sum = sum +sensors[i].average;
			   //  };
			   //  var allavg = sum/sensors.length;
			   //  sensors.push({id:'all', average:(Math.round(allavg*10)/10)});

				callback(null, sensors);	   			
	   		// }
	   		// catch(err){
	   		// 	callback(err, null);
	   		// }
	   }) 
	};

module.exports.get_temp_data =  get_temp_data;
 
