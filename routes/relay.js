var express = require('express')
var router = express.Router()

/* Require the <config module> for the pin numbers and the <relay module> for the functions that control
the relays via the gpios. */

var config = require('../config.json')
var relay = require('../my_modules/relay')

var status = require('../my_modules/status')

var pin = config.pin

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
    res.redirect('/')
  }
}

router.post('/actions', isRequestLocal, isAuthenticated, function (req, res, next) {
  if (req.body.status === 'Paused') {
    relay.act(pin.thermostat, 0, function (err) { // 0 = OFF
      if (err) {
        console.error(err)
        return next(err)
      }
    })
  } else if (req.body.status === 'Working') {
    relay.act(pin.thermostat, 1, function (err) { // 1 = ON
      if (err) {
        console.error(err)
        return next(err)
      }
    })
  }
  // save the working status in the memory database
  status.set_status(req.body.status, function (err) {
    if (err) {
      console.error(err)
      return next(err)
    }
  })

  res.contentType('json')
  res.send({
    result: 'ok'
  })
})

module.exports = router
