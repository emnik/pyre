var express = require('express');
var router = express.Router();
var passport = require('passport');

function isRequestLocal(req, res, next){
  var rpi_ip = req.hostname.split('.');
  var request_ip = req.connection.remoteAddress.split('.');
  var isLocal=true;
  for(i=0;i<=2;i++){
    if(rpi_ip[i]!==request_ip[i]){
      isLocal=false;
    }
  }
  req.isLocal = isLocal;
  next();
}

/* GET home page. */
router.get('/', isRequestLocal, function(req, res, next) {
  if(req.isLocal){
    return res.redirect('/therm');
  }
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
  req.logout();
  // req.session.destroy();
  res.redirect('/');
});


module.exports = router;
