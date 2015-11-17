var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');


// the timewindows configuration functions

function get_timetables(req, res, next){
	if (req.params.section=="timewindows"){
		db.all("SELECT * FROM time_window WHERE id NOT IN (1,2,3) ORDER BY on_time ASC;", function(err, rows){
			if (err){
				console.error(err);
				return next(err);
			}
			req.timetables = rows;
			next();
		})
	}
	else
	{
		next();
	}
}

function get_sensors(req,res,next){
	// if (req.params.section == 'timewindows'){
			db.all("SELECT  id, location FROM sensors;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.sensors = rows; //this is array
				// console.log(req.sensors);
				next();
				});
	// }
	// else
	// {
	// 	next();
	// }

}


/* GET home page. */
router.get('/:section', get_timetables, get_sensors, function(req, res) {
  var base_url = req.headers.host;
  if (req.params.section == 'timewindows'){
  	res.render('config/'+req.params.section, {timetables:req.timetables, sensors:req.sensors, base_url:base_url});
  }
})


router.post('/update_timewindows', function(req, res, next){
		var data = req.body.data;
		console.log(data);
		db.each("SELECT * from time_window WHERE id NOT IN (1,2,3);", function(err,row){
			if(err){
				console.error(err);
				return next(err);
			}
			var deltw = true;
			for (var i = data.length - 1; i >= 0; i--) {
				if(data[i].id==row.id){
					if(row.on_time!=data[i].on || row.off_time!=data[i].off || row.temp!=data[i].temp || row.sensor_ids!=data[i].sensors){
						console.log("updating time window with name: "+row.name);
						db.run("UPDATE time_window SET on_time=?, off_time=?, temp=?, sensor_ids=? WHERE id=?",[data[i].on, data[i].off, data[i].temp, data[i].sensors, data[i].id], function(err){
							if(err){
								console.error(err);
								return next(err);
							}
						})
					}
					else
					{
						console.log("time window "+row.name+" hasn't changed.")
					}
					deltw = false;
				}
			};
			if (deltw){
				console.log("Deleting time window with name: "+row.name);
				db.run("DELETE FROM time_window WHERE id=? AND protected=0", row.id, function(err){
					if(err){
						console.error(err);
						return next(err);
					}
				});
			}
		}, function(){
			var newtws = false;
			db.serialize(function(){
				for (var i = data.length - 1; i >= 0; i--) {
					if (data[i].id.substring(0,3)=="new"){
						newtws = true;
						console.log("Inserting new timewindow with name: "+data[i].name);
						db.run("INSERT INTO time_window (name, on_time, off_time, temp, sensor_ids, protected) VALUES (?, ?, ?, ?, ?, ?)",[data[i].name, data[i].on, data[i].off,data[i].temp, data[i].sensors, 0], function(err){
							if(err){
								console.error(err);
								return next(err);
							}
						}); 
					}
				};
			})
			if(!newtws){
				console.log("There were no new time windows to add.");
			}
			res.contentType('json');
			res.send({result:'ok'});
		})

});


router.post('/add_timewindow', get_sensors, function(req, res, next){
	res.contentType('json');
	res.send({result:'ok', sensors:req.sensors});
})

// end of timewindows configuration functions


module.exports = router;
