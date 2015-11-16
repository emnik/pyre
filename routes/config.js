var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');


// the timewindows configuration functions

function get_timetables(req, res, next){
	if (req.params.section=="timewindows"){
		db.all("SELECT * FROM time_window WHERE id<>1 AND id<>2 ORDER BY on_time ASC;", function(err, rows){
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
	if (req.params.section == 'timewindows'){
			db.all("SELECT  id, location FROM sensors;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.sensors = rows; //this is array
				// console.log(req.sensors);
				next();
				});
	}
	else
	{
		next();
	}

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
		db.each("SELECT * from time_window WHERE id<>1 AND  id <>2;", function(err,row){
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
				db.run("DELETE FROM time_window WHERE id=?", row.id, function(err){
					if(err){
						console.error(err);
						return next(err);
					}
				});
			}
		}, function(){
			res.contentType('json');
			res.send({result:'ok'});
		})

});


// end of timewindows configuration functions


module.exports = router;
