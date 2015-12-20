var express = require('express');
var router = express.Router();

var temperature = require("../my_modules/temperature");
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
    console.log("REDIRECT");
    res.redirect('/');
  }
}


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
       req.curtime = curtime;
       console.log(curtime);
       var getdata=[]; //get the current time window data (if exists)
       var nextdata=[]; //get the next time window for the current day - if exists a next one!

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


    function get_default_sensor(req, res, next){
      db.all('SELECT id FROM sensors WHERE preset=1 LIMIT 1;', function(err, rows){
        if (err){
          console.error(err);
          return next(err);
        }
        req.default_sensor = rows[0].id;
        next();
      })
    }


    function get_sensors(req, res, next){
      // var db = new sqlite3.Database('./sensor-data.sqlite');
           if (req.state.err===""){
               var sensors_arr=req.time_window_data[0].sensor_ids.split(',');               
           }
           else //in overlap or no timewindow the default sensor is used to show the temperature.
           {
             var sensors_arr=[];
             sensors_arr.push(req.default_sensor);
           }
           req.sensors = sensors_arr;

           // console.log(req.sensors);

           var sensors = sensors_arr.map(function(p){ return '"' + p + '"'; }).join(','); // needed to put it inside the IN(...) in the sql           
           db.all("SELECT id, location FROM sensors WHERE id IN ("+sensors+")", function(err,rows){
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
      // req.tempdata = null;
      temperature.get_temp_data(240, function(err, result){
        if(err){
          console.error(err);
          return next(err);
        }
        console.log(result);
        req.tempdata = result;
        next();
      })
    }



    function get_graph_data(req, res, next){
      //this function is used either at start, either when I need to update the graph data
      var interval;
      var labels=[];
      var temps=[];
      var options=[];
      req.graph_data={};

      if (req.body.sensor!='undefined' && req.body.sensor!=null){
        var selected_sensors=req.body.sensor;
      }
      else
      {
        var sensors = req.sensors.map(function(p){ return '"' + p + '"'; }).join(',');
        var selected_sensors = sensors;
      }
      // console.log(selected_sensors);
      // var selected_sensors = ((req.body.sensor!='undefined' && req.body.sensor!=null)? req.body.sensor : req.sensors);
      var duration = ((req.body.duration!='undefined' && req.body.duration!=null)? req.body.duration : "1"); //in hours
      
      if (duration<=24){
        var sql = "SELECT datetime((timestamp/1000)/?*?, 'unixepoch', 'localtime') as localtime, "+ 
        "date((timestamp/1000)/?*?, 'unixepoch', 'localtime') as date, "+
        "strftime('%H:%M', (timestamp/1000)/?*?, 'unixepoch', 'localtime') as time, "+
        "ROUND(avg(value),2) as temp "+
        // "sensor_id "+
        "FROM sensor_data "+
        "WHERE timestamp/1000 >= ((strftime('%s', 'now') - strftime('%S', 'now') + strftime('%f', 'now'))-3600*?) "+
        "AND sensor_id IN ("+selected_sensors+") "+
        "GROUP BY localtime "+
        "ORDER BY localtime ASC;";

        if(duration==1){
          interval=120;
        } else {
          interval = duration*150;
        }

        for (var i=1;i<=6;i++){options.push(interval);}
        options.push(duration);
      }
      else
      {
        interval = 24*3600;

        var sql = "SELECT date, "+
        "ROUND(avg(value),2) as temp "+
        "FROM sensor_history "+
        "WHERE date >= date('now',?) "+
        "AND sensor_id IN ("+selected_sensors+") "+
        "GROUP BY date "+
        "ORDER BY date ASC;";  

        options.push("-"+duration/24+" day");
      }



      db.each(sql,options, function(err, row){
        if(err){
          console.error(err);
          return next(err);
        }

        if(duration>24){labels.push(row.date);} else {labels.push(row.time);}
        temps.push(row.temp);
        },function(){
          req.graph_data.labels=labels;
          req.graph_data.temps=temps;
          next();
        });
      }


    router.post('/update_graph', get_graph_data, function(req, res){
        res.contentType('json');
        res.send({result:'ok', graph_data:req.graph_data});

    })

    function render_therm(req,res){
        var base_url = req.headers.host;
        // console.log(req.graph_data);
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.render('therm', {tempdata: req.tempdata, profiles: req.profiles, sensors: req.sensors, sensor_location:req.locations, default_sensor:req.default_sensor, time_window_data: req.time_window_data, state:req.state, time_window_next:req.time_window_next, graph_data:req.graph_data ,base_url:base_url, isLocal:req.isLocal, curtime:req.curtime});
      }


    // When I used the GET method to send the select box data to /therm I had as a first callback function
    // in the following line the set_profile function
    // *I use router.use (instead of router.get()) to catch both GET and POST requests
    router.use('/', isRequestLocal, isAuthenticated, update_profile, get_profiles,get_time_window_data, set_status, get_default_sensor, get_sensors, get_therm_data, get_graph_data, render_therm);

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
