var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');

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



module.exports = router;
