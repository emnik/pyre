/* Set up a shared sqlite3 database in memory to share the working status of the thermostat
 * between the various connections from various clients. I use a memory database as the data
 * does not need to be persistent between boots. If I have used a file db I would need to
 * delete it in every boot (or drop the table...) and the other option for sharing the status
 * would be something like using a global variable to share the info between clients but I
 * didn't manage to make it work correctly using the app.locals
 */

var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('file:memdb1?mode=memory&cache=shared')

db.run('CREATE TABLE IF NOT EXISTS thermo (id INTEGER PRIMARY KEY, status TEXT)', function (err) {
  if (err) {
    // console.error(err)
    return callback(err, null)
  }
  console.log('memory table check: ok')
})

function get_status (callback) { // callback(error, {status:...,id:...})
  db.all('SELECT * FROM thermo;', function (err, rows) {
    if (err) {
      return callback(err, null)
    }
    if (rows) {
      return callback(null, rows[0])
    }
    callback(null, null)
  })
}

function set_status (status, callback) {
  get_status(function (err, res) {
    if (err) {
      return callback(err)
    }
    if (res !== null && res !== undefined) {
      // console.log(res.id)
      db.run('UPDATE thermo SET status=? WHERE id=?', [status, res.id], function (err) {
        if (err) {
          return callback(err)
        }
        console.log('status is updated to: ' + status)
      })
    } else {
      db.run('INSERT INTO thermo (status) VALUES (?);', status, function (err) {
        if (err) {
          return callback(err)
        }
        console.log('status is set to: ' + status)
      })
    }
    callback(null)
  })
}

function finalize_status (callback) {
  set_status('Paused', function (err) {
    if (err) {
      return callback(err)
    } else {
      db.close(function (inerr) {
        if (inerr) {
          return callback(inerr)
        }
        callback(null)
      })
    }
  })
}

module.exports.get_status = get_status
module.exports.set_status = set_status
module.exports.finalize_status = finalize_status
