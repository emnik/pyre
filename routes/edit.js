var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite');

function isRequestLocal(req, res, next){
  var rpi_ip = req.hostname.split('.');
  var request_ip = req.connection.remoteAddress.split('.');
  var isLocal=true;
  for(i=1;i<=2;i++){
  	//I compare the second and third part of the ips so that 
  	//even if there is an IPv4 and an IPv6-IPv4-mapped address this would work!
    if(rpi_ip[i]!==request_ip[i]){
      isLocal=false;
    }
  }
  req.isLocal = isLocal;
  next();
}

function isAuthenticated(req, res, next) {
  if(req.isLocal){
    next();
  }
  else
  {
    if (req.isAuthenticated())
      return next();
    res.redirect('/');
  }
}

function get_sensors(req,res,next){
	// used by both router.post('/get_timewindow_by_id',...) and router.get('/:id',...)
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

    var locked_timewindows = {2:'CONSTANT_PROFILE',1:'DAY_PROFILE',3:'NIGHT_PROFILE'};//I could get this from a query...index = time_window_id

    for (var index in locked_timewindows) { //forEach is not working for js objects - only arrays!
    	if (name==locked_timewindows[index]){
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
	var profile_id = {'WEEKLY':3, 'CUSTOM':4};
	var id = profile_id[req.body.profile];
	db.each("SELECT id, daynum FROM schedule WHERE profile_id=?;",id, function(err,row){
			if (err){
				console.error(err);
				return next(err);
			}
			if (row.daynum=='*'){ //this is needed for the CUSTOM MODE
				schedule.push(row.id);
			}
			else
			{
				schedule[row.daynum] = row.id;
			}
	},function(){
		req.schedule = schedule;
		req.profile_id = id;
		next();
	})
}

router.post('/update_timetable', get_weekly_schedule_data, function(req,res){
	var newtimewindows = req.body.data; //double array
	var profile_name = req.body.profile;
	var schedule = req.schedule;
	if (schedule!=undefined && schedule!=null){ //propably unnessesary check...
		db.serialize(function(){
			db.run("DELETE FROM timetable WHERE schedule_id IN (SELECT id FROM schedule WHERE schedule.profile_id =?);",req.profile_id, function(err){
				if (err){
					console.error(err);
					return next(err);
				}
			});
			if (profile_name=='WEEKLY'){
				for (var i=0; i<=schedule.length; i++){
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
			}
			else if (profile_name=='CUSTOM'){
					for (var j in newtimewindows){
						db.run("INSERT INTO timetable (schedule_id, time_window_id) VALUES (?,?);",[schedule[0],newtimewindows[j]],function(err){
							if(err){
								console.error(err);
								return next(err);
								}
							} //end of callback
						) //end of db.run
					} //end of inner for loop
			
			}
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
	if (req.params.id==3 || req.params.id==4){
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
	if (req.params.id==3){ //required only for the WEEKLY MODE
		db.all("SELECT id, daynum FROM schedule WHERE profile_id=? ORDER BY daynum ASC;",req.params.id, function(err, rows){
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
	//Used by both Weekly and Custom Profiles to get the corresponding timewindows.
	if (req.params.id==3 || req.params.id==4){
		var timewindowsperday=[];
		db.each("select time_window.*, schedule.daynum from time_window join timetable on time_window.id = timetable.time_window_id join schedule on timetable.schedule_id = schedule.id where schedule.profile_id=? ORDER BY time_window.on_time ASC;",req.params.id, function(err, row){
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



router.get('/:id', isRequestLocal, isAuthenticated, get_sensors, get_timewindows, get_schedule, get_timewindows_perday, function(req, res) {
	var base_url = req.headers.host;
	var id = req.params.id;
	var show_edit=false;
	// console.log(req.sensors);
 	if (req.params.id==1){ //CONSTANT MODE
	 	db.all("SELECT  time_window.name, time_window.temp, time_window.sensor_ids FROM time_window LEFT JOIN timetable ON timetable.time_window_id = time_window.id LEFT JOIN schedule ON schedule.id = timetable.schedule_id LEFT JOIN profile ON profile.id = schedule.profile_id WHERE profile.id = 1 LIMIT 1;", function(err,rows){
				if(err){
					console.error(err);
					return next(err);
				};
				req.temp = rows[0];
				// console.log(req.temp);
				res.render('edit/constant', {curtemp: req.temp, sensors: req.sensors, base_url:base_url, isLocal:req.isLocal, show_edit:show_edit});
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
				res.render('edit/daynight', {dayTemp: req.dayTemp, nightTemp: req.nightTemp, sensors: req.sensors, base_url:base_url, isLocal:req.isLocal, show_edit:show_edit});
	        });
	 }
	 else if (req.params.id==3){ //WEEKLY MODE
	 	show_edit = true;
	 	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
	 	res.render('edit/weekly', {sensors: req.sensors, schedule: req.schedule, timewindow: req.timewindows, timewindowsperday:req.timewindowsperday, base_url:base_url, isLocal:req.isLocal, show_edit:show_edit});
	 }
	 else if (req.params.id==4){ //CUSTOM MODE
	 	show_edit = true;
	 	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
	 	res.render('edit/custom', {sensors: req.sensors, timewindow: req.timewindows, timewindowsperday:req.timewindowsperday, base_url:base_url, isLocal:req.isLocal, show_edit:show_edit})
	 }
})




module.exports = router;
