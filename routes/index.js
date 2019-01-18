var express = require('express')
var router = express.Router()
var passport = require('passport')
var package_json = require('../package.json')

function isRequestLocal (req, res, next) {
  var rpi_ip = req.hostname.split('.')
  var request_ip = req.connection.remoteAddress.split('.')
  var isLocal = true
  for (var i = 1; i <= 2; i++) {
    // I compare the second and third part of the IPs so that
    // even if there is an IPv4 and an IPv6-IPv4-mapped address this would work!
    if (rpi_ip[i] !== request_ip[i]) {
      isLocal = false
    }
  }
  req.isLocal = isLocal
  next()
}

/* GET home page. */
router.get('/', isRequestLocal, function (req, res, next) {
  if (req.isLocal) {
    // return res.redirect('/therm')
    return res.redirect('/pyre')
  }
  var base_url = req.headers.host
  res.render('index', {
    base_url: base_url
  })
})

/* Handle Login POST */
router.post('/login', passport.authenticate('local', {
  // successRedirect: '/therm',
  successRedirect: '/pyre',
  failureRedirect: '/'
}))

/* Handle Logout */
router.get('/logout', function (req, res) {
  req.logout()
  // req.session.destroy()
  res.redirect('/')
})

/* GET about page. */
router.get('/about', isRequestLocal, function (req, res, next) {
  var base_url = req.headers.host
  var ver = package_json.version
  res.render('about', {
    base_url: base_url,
    isLocal: req.isLocal,
    version: ver,
    show_edit: false
  })
})

module.exports = router
