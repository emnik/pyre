var temperature = require('../my_modules/temperature')
var sqlite = require('../my_modules/sqliteAsync')
var status = require('../my_modules/status')

function get_profiles () {
  return sqlite.allAsync('SELECT * FROM profile')
}

async function get_time_window_data() {
  // get current daynum: 0=Sunday,... 6=Saturday
  var d = new Date()
  var n = d.getDay()
  var h = d.getHours()
  var m = d.getMinutes()
  if (h < 10) h = '0' + h
  if (m < 10) m = '0' + m
  var curtime = h + ':' + m
  // console.log(curtime)
  var getdata = [] // get the current time window data (if exists)
  var nextdata = [] // get the next time window for the current day - if exists a next one!
  var sql = 'SELECT time_window.* FROM time_window JOIN timetable ON time_window.id = timetable.time_window_id WHERE timetable.schedule_id IN (SELECT schedule.id FROM schedule JOIN profile ON schedule.profile_id = profile.id WHERE profile.status=1 AND (schedule.daynum="*" OR schedule.daynum='+n+'))'
  var data = await sqlite.allAsync(sql)
  // console.log(data)
  data.forEach(function(tmwindow){
    // console.log(tmwindow)
    if (curtime >= tmwindow.on_time && curtime < tmwindow.off_time) { // Get the current time window data:
      getdata.push({
        id: tmwindow.id,
        name: tmwindow.name,
        on_time: tmwindow.on_time,
        off_time: tmwindow.off_time,
        sensor_ids: tmwindow.sensor_ids,
        temp: tmwindow.temp
      })
    } else { // Get all other time window data:
      nextdata.push({
        id: tmwindow.id,
        name: tmwindow.name,
        on_time: tmwindow.on_time,
        off_time: tmwindow.off_time,
        sensor_ids: tmwindow.sensor_ids,
        temp: tmwindow.temp
      }
    )}
  })
  // console.log(getdata)
  // console.log(nextdata)
  time_window_data = getdata
  nextdata.sort(compare) // sort all other time windows by the on_time property
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
  if (nextdata.length > 0) {
    var found = false
    var i = 0
    while (found === false && i <= nextdata.length - 1) {
      if (nextdata[i].on_time > curtime) {
        found = true
      } else {
        i++
      }
    }
    if (found === true) {
      // console.log(nextdata[i])
      time_window_next = nextdata[i]
    } else {
      // console.log(nextdata[0])
      time_window_next = nextdata[0]
    }
  } else {
    time_window_next = {} // empty object...
  }
  return {curtime: curtime, time_window_data:time_window_data, time_window_next: time_window_next}
};

function compare (a, b) {
  if (a.on_time < b.on_time) {
    return -1
  }
  if (a.on_time > b.on_time) {
    return 1
  }
  return 0
}

function set_status (time_window_data) {
    var state
    if (time_window_data.length === 0) {
    // console.log('We are not in a working time window.Send PAUSE signal!')
    state = {
      err: 'No_time_window'
    }
  } else if (time_window_data.length > 1) {
    // console.log('There is an overlap in time windows.Send PAUSE signal and FIX IT!')
    state = {
      err: 'Overlap'
    }
  } else {
    state = {
      err: ''
    }
  }
  return state
}

async function get_default_sensor () {
  var rows = await sqlite.allAsync('SELECT id FROM sensors WHERE preset=1 LIMIT 1;')
  var default_sensor = rows[0].id
  return default_sensor
}

async function get_sensors (state, time_window_data, default_sensor) {
  // return array data.sensors, data.locations
  if (state.err === '') {
    var sensors_arr = time_window_data[0].sensor_ids.split(',')
  } else {
    // in overlap or no timewindow the default sensor is used to show the temperature.
    sensors_arr = []
    sensors_arr.push(default_sensor)
  }
  //sensors = sensors_arr

  // console.log(req.sensors)

  var sensors = sensors_arr.map(function (p) {
    return '"' + p + '"'
  }).join(',') // needed to put it inside the IN(...) in the sql

  var rows = await sqlite.allAsync('SELECT id, location FROM sensors WHERE id IN (' + sensors + ')') 
  locations = rows
  // console.log(rows)
  return {sensors:sensors_arr, locations:locations}
  }

function get_therm_data () {
  /* Get the initial temperature data for the view */
  return new Promise(function(resolve, reject){
    temperature.get_temp_data(240, function (err, result) {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  })
}

// function get_status () {
//     /* get the working status from the memory database */
//     // var workstatus = ''
//     return new Promise(function(resolve, reject){
//       status.get_status(function (err, result) {
//         if (err) {
//           reject(err)
//         }
//         else 
//         {
//           console.log(result)
//           if (result) {workstatus = result.status}
//           else {workstatus = ""}
//           // console.log('FROM index route > the current status is: ' + workstatus)
//           resolve(workstatus)
//         }
//       })
//   })
// }


async function run(){
    try {
        const profiles = await get_profiles()
        const timewindows = await get_time_window_data()
        const time_window_data = timewindows.time_window_data
        const time_window_next = timewindows.time_window_next
        const curtime = timewindows.curtime
        const state = await set_status(time_window_data)
        const default_sensor = await get_default_sensor()
        const sensordata = await get_sensors(state, time_window_data, default_sensor)
        const sensors = sensordata.sensors
        const locations = sensordata.locations
        const tempdata = await get_therm_data()
        
        const status_data = await status.get_status()
        const workstatus = status_data[0].status

        const data = {
          tempdata: tempdata,
          profiles: profiles,
          sensors: sensors,
          sensor_location: locations,
          default_sensor: default_sensor,
          time_window_data: time_window_data,
          state: state,
          time_window_next: time_window_next,
          curtime: curtime,
          status: workstatus
        }
        // console.log(data)
        
        return data
    }
    catch (e) {
        console.error(e)
    }
        
}


module.exports.run = run
