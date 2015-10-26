var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');


router.post('/update_temp',function(req, res){
  console.log("the method used is:"+ req.method);
  if (req.method=='POST'){
    var targettemp = req.body.newtemp; //numeric
    var name = req.body.name; //string
    var sensor_ids = req.body.sensor_ids; //array
    var ids = sensor_ids.join(','); //array->string
    
    var profile = {2:'ALLDAY',1:'DAY',3:'NIGHT'};//I could get this from a query...index = time_window_id
    
    for (var index in profile) { //forEach is not working for js objects - only arrays!
    	if (name==profile[index]){
    		db.run("UPDATE time_window SET temp=?, sensor_ids=? WHERE id=?",targettemp,ids,index,function(err){
    			if (err==null){
    				res.contentType('json');
					res.send({result:'ok'});
    			}
    			else
    			{
    				// if the query is successfull, the this object contains the following -as an example.
    				// { sql: 'UPDATE time_window SET temp=?, sensor_ids=? WHERE id=?',lastID: 0,changes: 1 }
    				console.error(err);
    				res.contentType('json');
    				res.send({result:'error'}); //instead of a 500 error page I return an error status and I use it to inform the user
    			}
    		})
    	}
    };
	

  };
})

function get_sensors(req,res,next){
	db.all("SELECT  id, location FROM sensors;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.sensors = rows; //this is array
				// console.log(req.sensors);
				next();
				});
	        };


router.get('/:id', get_sensors, function(req, res) {
	var id = req.params.id;
	// console.log(req.sensors);
 	if (req.params.id==1){ //CONSTANT MODE
	 	db.all("SELECT  time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 1 LIMIT 1;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.temp = rows[0];
				console.log(req.temp);
				res.render('config/constant', {curtemp: req.temp, sensors: req.sensors});
	        });
	 }
	 else if (req.params.id==2){ //DAYNIGHT MODE
	 	db.all("SELECT time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 2 LIMIT 2;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.data = rows;
				if (rows[0].name=="DAY"){req.dayTemp = rows[0]};
				if (rows[1].name=="NIGHT"){req.nightTemp = rows[1]};
				console.log(rows);
				res.render('config/daynight', {dayTemp: req.dayTemp, nightTemp: req.nightTemp, sensors: req.sensors});
	        });
	 }
})




module.exports = router;