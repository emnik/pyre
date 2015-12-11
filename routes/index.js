var express = require('express');
var router = express.Router();
var passport = require('passport');
var relay = require('../my_modules/relay');
var config = require('../my_modules/config');
var pin = config.pin;


/* GET home page. */
router.get('/', function(req, res, next) {
  var base_url = req.headers.host;
  res.render('index', {base_url:base_url});
})

/* Handle Login POST */
router.post('/login', passport.authenticate('local', {
  successRedirect: '/therm',
  failureRedirect: '/'
  })
);

/* Handle Logout */
router.get('/logout', function(req, res) {
    //Pause the thermostat
    relay.act(pin.thermostat, 0, function(err){ //0=OFF
      if(err){
        console.error(err);
        return next(err);
      }
    }); 
  req.logout();
  // req.session.destroy();
  res.redirect('/');
});


module.exports = router;
