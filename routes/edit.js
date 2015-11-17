var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');


function get_sensors(req,res,next){
	// used by both router.post('/get_timewindow_by_id',...) and router.get('/:id',...)
	if (req.params.id!=4){
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


router.post('/get_timewindow_by_id', get_sensors, function(req,res){
	var id = req.body.id;
	var sensors = req.sensors;
	db.all('SELECT * from time_window WHERE id =?', id, function(err, rows){
		if (err){
			console.error(err);
			// return next(err);
			res.contentType('json');
    		res.send({result:'error'});
		}
		var timewindow = rows;
		res.contentType('json');
		res.send({result:'ok', timewindow:timewindow, sensors:sensors});
	})
})

router.post('/update_temp',function(req, res){
  // console.log("the method used is:"+ req.method);
  if (req.method=='POST'){
    var targettemp = req.body.newtemp; //numeric
    var name = req.body.name; //string
    var sensor_ids = req.body.sensor_ids; //array
    var ids = sensor_ids.join(','); //array->string

    var profile = {2:'CONSTANT_PROFILE',1:'DAY_PROFILE',3:'NIGHT_PROFILE'};//I could get this from a query...index = time_window_id

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

function get_weekly_schedule_data(req, res, next){
	var schedule = [];
	db.each("SELECT id, daynum FROM schedule WHERE profile_id=3;", function(err,row){
			if (err){
				console.error(err);
				return next(err);
			}
			schedule[row.daynum] = row.id;
	},function(){
		req.schedule = schedule;
		next();
	})
}

router.post('/update_timetable', get_weekly_schedule_data, function(req,res){
	var newtimewindows = req.body.data; //double array
	var schedule = req.schedule;
	// console.log(schedule);
	if (schedule!=undefined && schedule!=null){ //propably unneeded check...
		db.serialize(function(){
			db.run("DELETE FROM timetable WHERE schedule_id IN (SELECT id FROM schedule WHERE schedule.profile_id =3);", function(err){
				if (err){
					console.error(err);
					return next(err);
				}
			});
			for (var i=0; i<=6; i++){
				for (var j in newtimewindows[i]){
					db.run("INSERT INTO timetable (schedule_id, time_window_id) VALUES (?,?);",[schedule[i],newtimewindows[i][j]],function(err){
						if(err){
							console.error(err);
							return next(err);
							}
						} //end of callback
					) //end of db.run
				} //end of inner for loop
			} //end of outer for loop
			//if no error until here it is safe to sent a successfull response!
			res.contentType('json');
			res.send({result:'ok'});
		})//end of serialize``
	}
	else {
		res.contentType('json');
		res.send({result:'error'});
	}

});



function get_timewindows(req, res,next){
	if (req.params.id==3){
		db.all("SELECT * FROM time_window WHERE id NOT IN(1,2,3) ORDER BY time_window.on_time asc", function(err, rows){ //CONSTANT-DAY-NIGHT PROFILE timewindows should not be used in WEEKLY... (or CUSTOM) One can setup other profiles
			if (err){
				console.error(err);
				return next(err);
			};
			req.timewindows = rows;
			console.log(req.timewindows);
			next();
		});
	}
	else {
		next();
	}
}

function get_schedule(req, res, next){
	if (req.params.id==3){
		db.all("SELECT id, daynum FROM schedule WHERE profile_id=3 ORDER BY daynum ASC;", function(err, rows){
			if (err){
				console.error(err);
				return next(err);
			};
			req.schedule = rows;
			// console.log(req.schedule);
			next();
		})

	}
	else
	{
		next();
	}
}

function get_timewindows_perday(req, res, next){
	if (req.params.id==3){
		var timewindowsperday=[];
		db.each("select time_window.*, schedule.daynum from time_window join timetable on time_window.id = timetable.time_window_id join schedule on timetable.schedule_id = schedule.id where schedule.profile_id=3 ORDER BY time_window.on_time ASC;", function(err, row){
			if (err){
				console.error(err);
				return next(err);
			}
			timewindowsperday.push({day:row.daynum, id:row.id, name:row.name, on_time:row.on_time, off_time:row.off_time, temp:row.temp, sensor_ids:row.sensor_ids});
		},function(){
			req.timewindowsperday = timewindowsperday;
			// console.log(req.timewindowsperday);
			next();
		})
	}
	else
	{
		next();
	}
}


router.get('/:id', get_sensors, get_timewindows, get_schedule, get_timewindows_perday, function(req, res) {
	var base_url = req.headers.host;
	var id = req.params.id;
	// console.log(req.sensors);
 	if (req.params.id==1){ //CONSTANT MODE
	 	db.all("SELECT  time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 1 LIMIT 1;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.temp = rows[0];
				// console.log(req.temp);
				res.render('edit/constant', {curtemp: req.temp, sensors: req.sensors, base_url:base_url});
	        });
	 }
	 else if (req.params.id==2){ //DAYNIGHT MODE
	 	db.all("SELECT time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 2 LIMIT 2;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.data = rows;
				if (rows[0].name=="DAY_PROFILE"){req.dayTemp = rows[0]};
				if (rows[1].name=="NIGHT_PROFILE"){req.nightTemp = rows[1]};
				console.log(rows);
				res.render('edit/daynight', {dayTemp: req.dayTemp, nightTemp: req.nightTemp, sensors: req.sensors, base_url:base_url});
	        });
	 }
	 else if (req.params.id==3){ //WEEKLY
	 	res.render('edit/weekly', {sensors: req.sensors, schedule: req.schedule, timewindow: req.timewindows, timewindowsperday:req.timewindowsperday, base_url:base_url});
	 }
})




module.exports = router;
