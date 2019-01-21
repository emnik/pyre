var express = require('express')
var router = express.Router() 
var chart = require('../my_modules/chart_data')
var init = require('../my_modules/initiate')
var main = require('../my_modules/main')
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite')
var config = require('../config.json')
if (config.modules.sinric==='enabled'){
    var alexa = require('../my_modules/alexa')
}


function isRequestLocal (req, res, next) {
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
    next()
  }
  
  function isAuthenticated (req, res, next) {
    if (req.isLocal) {
      next()
    } else {
      if (req.isAuthenticated()) {
        return next()
      }
      console.log('REDIRECT')
      res.redirect('/')
    }
  }
  


  router.post('/update_graph', async function (req, res) {

    var graph_data = await chart.get_graph_data(req)
    // console.log(graph_data)
    res.contentType('json')
    if (graph_data.status === 'success'){
      res.send({
        result: graph_data.status,
        graph_data: graph_data.data
      })
    }
    else {
      res.send({
        result: graph_data.status
      })
    }
    })


  router.post('/away', function(req, res) {
    main.awayToggle(function(status){
      res.send({
          result: 'ok',
          status: status
        })
      })
  })


  router.post('/update_temp', function (req, res) {
      var targettemp = req.body.newtemp // numeric
      var twid = req.body.twid 
      var sensor_ids = req.body.sensor_ids // array
      var ids = sensor_ids.join(',') // array->string
      db.run('UPDATE time_window SET temp=?, sensor_ids=? WHERE id=?', targettemp, ids, twid, function (err) {
      if (err == null) {
        main.updateTarget(targettemp, function(status){
          console.log('status received='+status)
          res.contentType('json')
          res.send({
            result: 'ok',
            status: status
          })
          if (config.modules.sinric==='enabled'){
            alexa.manualTargetUpdate(targettemp)
          }
        }) // update the running profile's target temp!
      } else {
        // if the query is successfull, then this object contains the following -as an example.
        // { sql: 'UPDATE time_window SET temp=?, sensor_ids=? WHERE id=?',lastID: 0,changes: 1 }
        console.error(err)
        res.contentType('json')
        res.send({
          result: 'error'
        }) // instead of a 500 error page I return an error status and I use it to inform the user
      }
    })
  })



async function render_pyre (req, res) {
    var data = await init.run()
    // var data = await main.start()
    var base_url = req.headers.host
    data.base_url = base_url
    data.isLocal = req.isLocal
    data.minTemp = config.thermostat.min
    data.maxTemp = config.thermostat.max
    data.stepTemp = config.thermostat.step
    // console.log(data)

    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    res.header('Expires', '-1')
    res.header('Pragma', 'no-cache')
    res.render('pyre', data)
  }


router.use('/', isRequestLocal, isAuthenticated, render_pyre)


module.exports = router;