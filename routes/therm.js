var express = require('express')
var router = express.Router()
var chart = require('../my_modules/chart_data')
var init = require('../my_modules/initiate')

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
    res.send({
      result: 'ok',
      graph_data: graph_data
    })
  })
  

  async function render_therm (req, res) {
    var data = await init.run()
    var base_url = req.headers.host
    
    data.base_url = base_url
    data.isLocal = req.isLocal

    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    res.header('Expires', '-1')
    res.header('Pragma', 'no-cache')
    res.render('therm', data)
  }


router.use('/', isRequestLocal, isAuthenticated, render_therm)


module.exports = router;