var later = require('later');
var archive_db = require('../my_modules/archive_db');

/**
 * schedule sensor data archive every day at the time (24 hour) that is specified here
 * using later.js
 */

// set later to use local time
later.date.localTime();
// var sched=later.parse.recur().on('11:55:00').time();
var sched=later.parse.recur().on('11:55:00').time();

later.setInterval(function(){
  archive_db.archive_database(function(err){
    if(err){
      console.error(err);
    }
    else
    {
      console.log('sensor data are archived successfully!');
    }
  })
}, sched)
