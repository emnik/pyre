var express = require('express');
var router = express.Router();

var temperature = require("../my_modules/temperature");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');
// var ds1820 = require('../my_modules/ds1820');


/*
* Instead of sending the data from the select box via get, I preffered to send them via POST in the /therm/profile
* location so that I can handle them and then redirect again to /therm. The user this way does never see the
* /them/profile address in the location bar as there is no rendering there!!!
*/
// router.post('/profile', function(req, res, next){
//   var selected_profile = req.body.selected_profile;
//   console.log("selected_profile= " + selected_profile);
//   var db = new sqlite3.Database('./sensor-data.sqlite');
//   db.serialize(function(){
//     db.run("UPDATE profile SET status=0");
//     db.run("UPDATE profile SET status=1 WHERE id=?",selected_profile);
//   })
//   db.close();
//   res.redirect('/therm');
// })

function update_profile (req, res, next){
  console.log("the method used is:"+ req.method);
  if (req.method=='POST'){
    var selected_profile = req.body.selected_profile;
    console.log("selected_profile= " + selected_profile);
    // var db = new sqlite3.Database('./sensor-data.sqlite');
    db.serialize(function(){
      db.run("UPDATE profile SET status=0", function(err){
        if(err){
          console.error(err);
          return next(err); /*this will get to the default errorhandler and show a 500 error page
          or maybe I should make my own error page [especially for LITESQL errors that are likely not persistant]
          where a link to the home page will exist...
          If it is a random SQL error then just the profile change failed... If otherwise the
          user could still exit the app! If he is only shown the 500 page he cannot do anything
          in either case...
          */ 
          }
          else
          {
            db.run("UPDATE profile SET status=1 WHERE id=?",selected_profile, function(err){
              if(err){
                console.error(err);
                return next(err);
              };
            });
            next();
          }
        });
      });
    }
    else
    {
       next();
    }
  }




    function get_profiles(req,res,next){
      // var db = new sqlite3.Database('./sensor-data.sqlite');
        db.all("SELECT * FROM profile", function(err, rows){
          if (err){
            console.error(err);
            return next(err);
          }
          req.profiles = rows;
          console.log(rows);
          // db.close();
          next();
      })
    }


    function get_time_window_data(req, res, next){
       // var db = new sqlite3.Database('./sensor-data.sqlite');
       //get current daynum: 0=Sunday,... 6=Saturday
       var d = new Date();
       var n = d.getDay();
       var h = d.getHours();
       var m = d.getMinutes();
       if (h<10) h="0"+h;
       if (m<10) m="0"+m;
       var curtime = h+":"+m;
       console.log(curtime);
       var getdata=[]; //get the current time window data (if exists)
       var nextdata=[]; //get the next time window for the current day - if exists a next one!
       //var getdays=[];
       //db.serialize() isn't needed as it is only for updates and inserts
       //I could use it without any harm but it wouldn't do anything
       //When db.serialize() is used, the db.close() shouldn't be used!!!
       // var c=0;
       // db.each("SELECT schedule.id, daynum FROM schedule JOIN profile ON schedule.profile_id = profile.id WHERE profile.status=1", function(err, rows){
       //    getdays.push({id:rows.id});
       //    if (rows.daynum == "*" || rows.daynum == n) {
       //      db.each("SELECT time_window.* FROM time_window JOIN timetable ON time_window.id = timetable.time_window_id WHERE timetable.schedule_id=" + rows.id+";", function(suberr, subrows){
       //        c++;
       //        //the time must be set in 24 hour mode
       //        if (curtime>=subrows.on_time && curtime<subrows.off_time) {
       //          getdata.push({id:subrows.id, name:subrows.name, on_time:subrows.on_time, off_time:subrows.off_time, sensor_ids:subrows.sensor_ids, temp:subrows.temp});
       //        };
       //      },function(){
       //        /*this is the COMPLETE CALLBACK that gets called after the sub each query ends.
       //        If I try to access getdata array elsewhere, it will be empty because of the asynchronous
       //        nature of node.js*/
       //        req.time_window_data = getdata;
       //        // req.daysnum = getdays;
       //        console.log(c, getdays.length);
       //        if(c==getdays.length || c==0) {
       //          console.log(getdata);
       //          next(); //next should be called once! THIS WAS A BIG PROBLEM - THATs WHY I COMMENTED OUT!!!
       //        }
       //      });
       //    };
       //  })


        db.each('SELECT time_window.* FROM time_window JOIN timetable ON time_window.id = timetable.time_window_id WHERE timetable.schedule_id IN (SELECT schedule.id FROM schedule JOIN profile ON schedule.profile_id = profile.id WHERE profile.status=1 AND (schedule.daynum="*" OR schedule.daynum=?))',n,function(suberr,subrows){
              //the time must be set in 24 hour mode
              if (suberr){
                console.error(suberr);
                return next(err);
              };
              if (curtime>=subrows.on_time && curtime<subrows.off_time) { //Get the current time window data:
                getdata.push({id:subrows.id, name:subrows.name, on_time:subrows.on_time, off_time:subrows.off_time, sensor_ids:subrows.sensor_ids, temp:subrows.temp});
              }
              else { //Get all other time window data:
                nextdata.push({id:subrows.id, name:subrows.name, on_time:subrows.on_time, off_time:subrows.off_time, sensor_ids:subrows.sensor_ids, temp:subrows.temp});
              }
        },function(){
          req.time_window_data = getdata;
          console.log(getdata);
          //console.log(nextdata.sort(compare));
          nextdata.sort(compare); //sort all other time windows by the on_time property
          /*
          * arr.sort([compareFunction])
          * compareFunction Optional.
          * If compareFunction is supplied, the array elements are sorted according to the return value of the compare function. If a and b are two elements being compared, then:
          * If compareFunction(a, b) is less than 0, sort a to a lower index than b, i.e. a comes first.
          * If compareFunction(a, b) returns 0, leave a and b unchanged with respect to each other, but sorted with respect to all different elements. Note: the ECMAscript standard does not guarantee this behaviour, and thus not all browsers (e.g. Mozilla versions dating back to at least 2003) respect this.
          * If compareFunction(a, b) is greater than 0, sort b to a lower index than a.
          * compareFunction(a, b) must always return the same value when given a specific pair of elements a and b as its two arguments. If inconsistent results are returned then the sort order is undefined
          * MY COMPARE FUNCTION IS THE NEXT FUNCTION!!!
          */

          // Find the next time window
          if (nextdata.length>0){
            var found = false;
            var i = 0;
            while (found==false && i <= nextdata.length-1)
            {
              if (nextdata[i].on_time > curtime) {found = true;}
              else {i++;}
            }
            if (found==true) {
              console.log(nextdata[i]);
              req.time_window_next = nextdata[i];
            }
            else {
              console.log(nextdata[0]);
              req.time_window_next = nextdata[0];
            }
          }
          else {
            req.time_window_next = {}; // empty object...
          }
          next(); //next should be called once!
        })
      // db.close();
    };

    function compare(a,b) {
      if (a.on_time < b.on_time)
        return -1;
      if (a.on_time > b.on_time)
        return 1;
      return 0;
    }


    function set_status(req, res, next){
      if(req.time_window_data.length===0){
        // console.log("We are not in a working time window.Send PAUSE signal!");
        req.state = {err:"No_time_window"};
      }
      else if(req.time_window_data.length>1){
        // console.log("There is an overlap in time windows.Send PAUSE signal and FIX IT!");
        req.state = {err:"Overlap"};
      }
      else req.state = {err:""};
      next();
    }

    function get_sensors(req, res, next){
      // var db = new sqlite3.Database('./sensor-data.sqlite');
           if (req.state.err===""){
               var sensors_arr=req.time_window_data[0].sensor_ids.split(',');
               var sensors = sensors_arr.map(function(p){ return '"' + p + '"'; }).join(',');
               if (sensors_arr.length > 1) {req.sensors = "all"} else {req.sensors = sensors_arr[0]};
             }
           else
           {
             var sensors="1";
             req.sensors = sensors;
           }
           // console.log(sensors);
           db.all("SELECT location FROM sensors WHERE id IN ("+sensors+")", function(err,rows){
              if (err){
                console.error(err);
                return next(err);
              };
              req.locations = rows;
              // console.log(rows);
              // db.close();
              next();
           })
    }

    function get_therm_data(req, res, next){
      /* Get the initial temperature data for the view*/
      temperature.get_temp_data(240);
      console.log(temperature.result);
      if (temperature.result.mean_sensor_1!=0)
      {
        switch (req.sensors) {
          case '1':
            req.tempdata = temperature.result.mean_sensor_1;
            break;
          case '2':
            req.tempdata = temperature.result.mean_sensor_2;
            break;
          case 'all':
            req.tempdata = temperature.result.mean_sensor_all;
            break;  
          default:
            req.tempdata = {};
        }
      // console.log(req.tempdata);
      }
      next();
    }

    function render_therm(req,res){
      res.render('therm', {tempdata: req.tempdata, profiles: req.profiles, sensors: req.sensors, sensor_location:req.locations, time_window_data: req.time_window_data, state:req.state, time_window_next:req.time_window_next});
      }



    // When I used the GET method to send the select box data to /therm I had as a first callback function
    // in the following line the set_profile function
    // *I use router.use (instead of router.get()) to catch both GET and POST requests
    router.use('/', update_profile, get_profiles,get_time_window_data, set_status, get_sensors, get_therm_data,  render_therm);

    //GET therm page with one sqlite query
    //router.get('/therm', function(req, res) {
        // var db = new sqlite3.Database('./sensor-data.sqlite');
        // db.all("SELECT * FROM profile", function(err, rows){
        //   var profiles = req.param('profiles', rows);
        //   res.render('therm', {profiles: profiles});
        //   db.close();
        // });
      // })


module.exports = router;
