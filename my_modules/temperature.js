var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite')
db.configure('busyTimeout', 2000)

function get_temp_data (duration, callback) {
  var sensors = []

  db.each('SELECT sensor_data.sensor_id AS id, sensors.priority AS priority, AVG(sensor_data.value) as average FROM sensor_data LEFT JOIN sensors ON sensor_data.sensor_id = sensors.id WHERE sensor_data.timestamp >= ? GROUP BY sensor_data.sensor_id;', (Date.now() - duration * 1000), function (err, row) {
    if (err) {
      console.error(err)
      return callback(err, null)
    };
    sensors.push({
      id: row.id,
      priority: row.priority,
      average: (Math.round(row.average * 10) / 10)
    })
  }, function () {
    callback(null, sensors)
  })
};

module.exports.get_temp_data = get_temp_data
