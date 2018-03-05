var express = require('express')
var router = express.Router()
var archive_db = require('../my_modules/archive_db')
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite')
var jsonexport = require('jsonexport')
var fs = require('fs')
var passport = require('passport')
var crypto = require('crypto')
var http = require('http')
var url = require('url')

function isRequestLocal(req, res, next) {
  var rpi_ip = req.hostname.split('.')
  var request_ip = req.connection.remoteAddress.split('.')
  var isLocal = true
  for (var i = 1; i <= 2; i++) {
    // I compare the second and third part of the ips so that
    // even if there is an IPv4 and an IPv6-IPv4-mapped address this would work!
    if (rpi_ip[i] !== request_ip[i]) {
      isLocal = false
    }
  }
  req.isLocal = isLocal
  return next()
}

function isAuthenticated(req, res, next) {
  if (req.isLocal) {
    next()
  } else {
    if (req.isAuthenticated()) {
      return next()
    }
    res.redirect('/')
  }
}

function get_sensors(req, res, next) {
  db.all('SELECT  * FROM sensors;', function(err, rows) {
    if (err) {
      console.error(err)
      return next(err)
    };
    req.sensors = rows // this is array
    // console.log(req.sensors)
    next()
  })
}

// the timewindows configuration functions

function get_timetables(req, res, next) {
  if (req.params.section === 'timewindows') {
    db.all('SELECT * FROM time_window WHERE id NOT IN (1,2,3) ORDER BY on_time ASC;', function(err, rows) {
      if (err) {
        console.error(err)
        return next(err)
      }
      req.timetables = rows
      next()
    })
  } else {
    next()
  }
}

router.post('/update_timewindows', function(req, res, next) {
  var data = req.body.data
  console.log(data)
  db.each('SELECT * from time_window WHERE id NOT IN (1,2,3);', function(err, row) {
    if (err) {
      console.error(err)
      return next(err)
    }
    var deltw = true
    for (var i = data.length - 1; i >= 0; i--) {
      if (parseInt(data[i].id, 10) === row.id) {
        if (row.on_time !== data[i].on || row.off_time !== data[i].off || row.temp !== data[i].temp || row.sensor_ids !== data[i].sensors) {
          console.log('updating time window with name: ' + row.name)
          db.run('UPDATE time_window SET on_time=?, off_time=?, temp=?, sensor_ids=? WHERE id=?', [data[i].on, data[i].off, data[i].temp, data[i].sensors, data[i].id], function(err) {
            if (err) {
              console.error(err)
              return next(err)
            }
          })
        } else {
          console.log('time window ' + row.name + " hasn't changed.")
        }
        deltw = false
      }
    };
    if (deltw) {
      console.log('Deleting time window with name: ' + row.name)
      db.run('DELETE FROM time_window WHERE id=? AND protected=0', row.id, function(err) {
        if (err) {
          console.error(err)
          return next(err)
        }
      })
    }
  }, function() {
    var newtws = false
    db.serialize(function() {
      for (var i = data.length - 1; i >= 0; i--) {
        if (data[i].id.substring(0, 3) === 'new') {
          newtws = true
          console.log('Inserting new timewindow with name: ' + data[i].name)
          db.run('INSERT INTO time_window (name, on_time, off_time, temp, sensor_ids, protected) VALUES (?, ?, ?, ?, ?, ?)', [data[i].name, data[i].on, data[i].off, data[i].temp, data[i].sensors, 0], function(err) {
            if (err) {
              console.error(err)
              return next(err)
            }
          })
        }
      };
    })
    if (!newtws) {
      console.log('There were no new time windows to add.')
    }
    res.contentType('json')
    res.send({
      result: 'ok'
    })
  })
})

router.post('/add_timewindow', get_sensors, function(req, res, next) {
  res.contentType('json')
  res.send({
    result: 'ok',
    sensors: req.sensors
  })
})

// end of timewindows configuration functions

// sensors configuration functions
router.post('/update_sensors', function(req, res, next) {
  var data = req.body.data
  // console.log(data);
  for (var i = data.length - 1; i >= 0; i--) {
    db.serialize(function() {
      db.run('UPDATE sensors SET type=?, location=?, name=?, uid=?, status=?, preset=? WHERE id=?', [data[i].type, data[i].location, data[i].name, data[i].uid, data[i].status, data[i].preset, data[i].id], function(err) {
        if (err) {
          console.error(err)
          return next(err)
        }
      })
    })
  }
  res.contentType('json')
  res.send({
    result: 'ok'
  })
})

// end of sensors configuration functions

// database functions

function get_data_to_archive(req, res, next) {
  var sql = 'SELECT COUNT(id) as records ' +
    'FROM sensor_data ' +
    "WHERE timestamp/1000 < ((strftime('%s', 'now') - strftime('%S', 'now') + strftime('%f', 'now'))-3600*24)"

  db.all(sql, function(err, rows) {
    if (err) {
      console.log(err)
      return next(err)
    }
    req.need_to_archive = rows[0].records
    next()
  })
}

router.post('/archive_database', get_data_to_archive, function(req, res, next) {
  res.contentType('json')
  // console.log(req.body.action)
  console.log(req.need_to_archive)
  // if there are more than 20000 records unarchived then it has a point to manually archive
  if (req.need_to_archive < 20000 && req.body.action !== 'force') {
    console.log('there is no need to archive manually!')
    return res.send({
      result: 'no need'
    }) // using return to exit the function
  }
  archive_db.archive_database(function(err) {
    if (err) {
      console.error(err)
      res.send({
        result: 'error'
      })
    } else {
      res.send({
        result: 'ok'
      })
    }
  })
})

function get_history_data_to_export(req, res, next) {
  // get the data from history table
  db.all('SELECT sensor_id, location, date, ROUND(avg(value),2) as temp FROM sensor_history join sensors on sensors.id=sensor_history.sensor_id GROUP BY date, sensor_id ORDER BY date ASC, sensor_id ASC;', function(err, rows) {
    if (err) {
      console.error(err)
      req.export_hist_err = err
      return next()
    }
    req.export_hist_err = null
    req.history_data_to_export = rows
    // console.log(rows)
    next()
  })
}

function get_latest_sensor_data_to_export(req, res, next) {
  // get the data from sensors_data table (these are the latest data that have not beed archived)
  db.all("SELECT sensor_id, location, strftime('%Y-%m-%d',(timestamp/1000)/86400*86400, 'unixepoch', 'localtime') as date, ROUND(avg(value),2) as temp FROM sensor_data join sensors on sensors.id=sensor_data.sensor_id GROUP BY date, sensor_id ORDER BY date ASC, sensor_id ASC", function(err, rows) {
    if (err) {
      console.error(err)
      req.export_latest_err = err
      return next()
    }
    req.export_latest_err = null
    req.latest_sensor_data_to_export = rows
    // console.log(rows)
    next()
  })
}

router.post('/export_database', get_history_data_to_export, get_latest_sensor_data_to_export, function(req, res, next) {
  res.contentType('json')
  if (req.export_hist_err !== null || req.export_latest_err !== null) {
    return res.send({
      result: 'error'
    })
  }
  // Merge the data from the 2 tables. If there are data for the same day and sensor merge them using their average!
  var data_to_export = req.history_data_to_export
  var hist = req.history_data_to_export
  var lat = req.latest_sensor_data_to_export

  for (var i = lat.length - 1; i >= 0; i--) {
    var j = hist.length - 1
    var found = false
    while (j >= 0 && found === false) {
      if ((hist[j].date === lat[i].date) && (hist[j].sensor_id === lat[i].sensor_id)) {
        found = true
        var avg = (lat[i].temp + hist[j].temp) / 2
        data_to_export[j].temp = Math.round(avg * 100) / 100
      }
      j--
    }
    if (!found) {
      data_to_export.push(lat[i])
    }
  }
  // generate the csv file for the user to download.
  // console.log(data_to_export)
  var wstream = fs.createWriteStream('/home/pi/apps/pyre/public/files/sensor_data.csv')
  // node.js is async so we set a trigger event for the wstream end...
  wstream.on('finish', function () {
    console.log('The export file (sensor_data.csv) has been written successfully!')
    return res.send({result: 'ok'})
  })
  jsonexport(data_to_export, function (err, csv) {
    if (err) {
      console.log(err)
      return res.send({result: 'error'})
    } else {
      // console.log(csv)
      wstream.write(csv)
      wstream.end()
    }
  })
})

// end of database functions

// configure account account functions

function hashPassword(password, salt) {
  var hash = crypto.createHash('sha256')
  hash.update(password)
  hash.update(salt)
  return hash.digest('hex')
}

router.post('/change_credentials', function(req, res, next) {
  res.contentType('json')
  if (req.body.new_username !== '' && req.body.new_password !== '' && req.body.confirm_password !== '') {
    if (req.body.new_password === req.body.confirm_password) {
      var salt = crypto.randomBytes(16).toString('hex')
      var shaPass = hashPassword(req.body.new_password, salt)
      db.run('UPDATE users SET username=?, password=?, salt=? WHERE username=?', [req.body.new_username, shaPass, salt, req.user[0].username], function(err) {
        if (err) {
          console.error(err)
          // return next(err)
          return res.status(500).send({
            result: 'error',
            error: err
          })
        }
        res.status(200).send({
          result: 'ok'
        })
      })
    } else {
      res.status(200).send({
        result: 'noConfirm'
      })
    }
  } else {
    res.status(200).send({
      result: 'all_required'
    })
  }
})

// end of account account functions

/* GET home page. */
router.get('/:section', isRequestLocal, isAuthenticated, get_timetables, get_sensors, function(req, res) {
  var base_url = req.headers.host
  var show_edit = false
  if (req.params.section === 'timewindows') {
    res.render('config/' + req.params.section, {
      timetables: req.timetables,
      sensors: req.sensors,
      base_url: base_url,
      isLocal: req.isLocal,
      show_edit: show_edit
    })
  } else if (req.params.section === 'sensors') {
    res.render('config/' + req.params.section, {
      sensors: req.sensors,
      base_url: base_url,
      isLocal: req.isLocal,
      show_edit: show_edit
    })
  } else if (req.params.section === 'database') {
    res.render('config/' + req.params.section, {
      base_url: base_url,
      isLocal: req.isLocal,
      show_edit: show_edit
    })
  } else if (req.params.section === 'settings') {
    res.render('config/' + req.params.section, {
      base_url: base_url,
      isLocal: req.isLocal
    })
  } else if (req.params.section === 'account') {
    if (req.isAuthenticated()) {
      res.render('config/' + req.params.section, {
        base_url: base_url,
        isLocal: req.isLocal,
        show_edit: show_edit
      })
    } else {
      // if is not authenticated we present a login form for the user to login so he can change the credentials!
      res.render('config/login', {
        base_url: base_url,
        isLocal: req.isLocal,
        show_edit: show_edit
      })
    }
  }
})

/* Handle Login POST */
router.post('/login', passport.authenticate('local', {
  successRedirect: '/config/account',
  failureRedirect: '/config/account'
}))

module.exports = router
