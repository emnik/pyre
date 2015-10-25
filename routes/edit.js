var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');


router.post('/update_temp',function(req, res){
  console.log("the method used is:"+ req.method);
  if (req.method=='POST'){
    var targettemp = req.body.newtemp;
    var name = req.body.name;
    if (name=='ALLDAY'){
    	console.log("new target temp = " + targettemp);
    	db.run("UPDATE time_window SET temp=? WHERE id=2",targettemp);
	}
	else if (name=='DAY'){
		console.log("new day target temp = " + targettemp);
    	db.run("UPDATE time_window SET temp=? WHERE id=1",targettemp);
	}
	else if (name=='NIGHT'){
		console.log("new night target temp = " + targettemp);
    	db.run("UPDATE time_window SET temp=? WHERE id=3",targettemp);
	}
	res.contentType('json');
	res.send({result:'ok'});
  };
})

function get_sensors(req,res,next){
	db.all("SELECT  id, location FROM sensors;", function(err,rows){
				req.sensors = rows;
				// console.log(req.sensors);
				next();
				});
	        };


router.get('/:id', get_sensors, function(req, res) {
	var id = req.params.id;
	console.log(req.sensors);
 	if (req.params.id==1){ //CONSTANT MODE
	 	db.all("SELECT  time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 1 LIMIT 1;", function(err,rows){
				req.temp = rows[0];
				console.log(req.temp);
				res.render('config/constant', {curtemp: req.temp, sensors: req.sensors});
	        });
	 }
	 else if (req.params.id==2){ //DAYNIGHT MODE
	 	db.all("SELECT time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 2 LIMIT 2;", function(err,rows){
				req.data = rows;
				if (rows[0].name=="DAY"){req.dayTemp = rows[0]};
				if (rows[1].name=="NIGHT"){req.nightTemp = rows[1]};
				console.log(rows);
				res.render('config/daynight', {dayTemp: req.dayTemp, nightTemp: req.nightTemp, sensors: req.sensors});
	        });
	 }
})




module.exports = router;