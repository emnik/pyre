var mqtt = require('mqtt')
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite')

// MQTT setup
var mqttclient = mqtt.connect({
  host: '10.185.9.113',
  port: 1883,
  username: 'mosquitto',
  password: 'pyre2017',
  reconnectPeriod: 5000
})

mqttclient.on('offline', function () {
  console.error('The MQTT server is offline!')
})

mqttclient.on('reconnect', function () {
  console.log('Trying to reconnect to mqtt server...')
})

mqttclient.on('error', function () {
  mqttclient.end()
})

mqttclient.on('connect', function (connack) {
  // console.log(connack)
  mqttclient.subscribe('pyre/#', function (err, granded) {
    if (err) {
      console.error(err)
    } else {
      console.log(granded)
      mqttclient.publish('pyre', 'Pyre connected to the MQTT broker!')
    }
  })
})

mqttclient.on('message', function (topic, message) {
  // message is Buffer
  var section = topic.toString().split('/')
  if (section.length > 1 && section[0] === 'pyre') {
    if (/^\d+$/.test(section[1])) { // check if the topic is in the form /pyre/numeric(uid)/temperature_value
      var tempstr = message.toString() // get the temperature as string
      var temp = parseFloat(tempstr) // convert it to float
      var data = {
        temperature_record: [{
          unix_time: Date.now(),
          celsius: Math.round(temp * 10) / 10, // round temperature to 1 decimal digit
          uid: section[1]
        }]
      }
      // console.log(data);
      insertMqttTemp(data, function (error) {
        if (error) {
          callback (error)
        }
      })
    }
  }
  // mqttclient.end();
})

function insertMqttTemp (data, callback) {
  // console.log('storing new data in db...')
  db.all('SELECT id, status FROM sensors WHERE type = ? AND uid=? LIMIT 1', ['WeMos D1mini', data.temperature_record[0].uid], function (err, row) {
    if (err) {
      return callback(err)
    }
    if (row.length === 0) { // New remote sensor! Just Insert it in the sensor table and mark it's status as disabled. The user has first to set location and enable
      var name = 'WeMosD1mini-ID' + data.temperature_record[0].uid
      db.run("INSERT INTO sensors (type, name, uid, status, preset) VALUES ('WeMos D1mini',?, ?, 0, 0)", [name, data.temperature_record[0].uid], function (err) {
        if (err) {
          callback(err)
        }
        console.log('We have a new temp sensor online with WeMos id: ' + data.temperature_record[0].uid + ' which is now registered (but disabled) with id: ' + this.lastID)
      })
    } else { // existing sensor
      if (row[0].status === 1) { // if the existing sensor is enabled (status=1), then we store the data. else we ignore them!!!
        var sensor_id = row[0].id
        db.run('INSERT INTO sensor_data (timestamp, sensor_id, value) VALUES (?, ?, ?)', [data.temperature_record[0].unix_time, sensor_id, data.temperature_record[0].celsius], function (err) {
          if (err) {
            callback(err)
          }
        })
      }
    }
  })
}
