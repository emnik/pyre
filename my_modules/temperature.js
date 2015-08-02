/*
*In this file there are the functions to retrieve the temperature data for the 2 sensors that are being used
*for the operation of the thermostat
*/

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sensor-data.sqlite');
db.configure("busyTimeout", 2000);
var result = {};

function get_temp_data(duration) {
  // var db = new sqlite3.Database('./sensor-data.sqlite');
  // db.configure("busyTimeout", 2000);
  var mean_sensor_1, mean_sensor_2;
  var add_sensor_1 = 0;
  var add_sensor_2 = 0;
  var counter_sensor_1 = 0;
  var counter_sensor_2 = 0;

  db.each("SELECT sensor_id AS id, value FROM sensor_data WHERE timestamp >= ?", (Date.now()-duration*1000), function (err, row) {
    if (err) {
      console.log("from temperature.js:")
      console.error(err);
      process.exit(1);
    };

    if (row.id==1) //sometimes after POST it fails with row as undefined ???
    {
      add_sensor_1 += row.value;
      counter_sensor_1++;
    }
    else
    {
      add_sensor_2 += row.value;
      counter_sensor_2++;
    }
  },function(){
    if (counter_sensor_1!=0) {mean_sensor_1 = add_sensor_1 / counter_sensor_1} else {mean_sensor_1 = 0};
    if (counter_sensor_2!=0) {mean_sensor_2 = add_sensor_2 / counter_sensor_2} else {mean_sensor_2 = 0};
    //console.log(counter_sensor_1, counter_sensor_2);
    //console.log(Math.round(mean_sensor_1 * 10) / 10, Math.round(mean_sensor_2 * 10) / 10);
    result.mean_sensor_1 = Math.round(mean_sensor_1 * 10) / 10;

    if (mean_sensor_2==0) //if sensor 2 (remote) is not available... use sensor 1 as fallback
    {result.mean_sensor_2 = Math.round(mean_sensor_1 * 10) / 10;}
    else
    {result.mean_sensor_2 = Math.round(mean_sensor_2 * 10) / 10;}


    if (mean_sensor_1*mean_sensor_2!=0) //if neither mean sensor is zero I calculate their mean value
    {
      result.mean_sensor_all = Math.round((mean_sensor_1+mean_sensor_2)/2 * 10) / 10;
    }
    else //If one of them is zero I use it's value as their mean value. As I don't know who's value is zero, I use their addition
    {
      result.mean_sensor_all = Math.round((mean_sensor_1+mean_sensor_2) * 10) / 10;
    }

    //console.log(result);

  });
  //db.close();
}

module.exports.get_temp_data =  get_temp_data;
module.exports.result = result;
