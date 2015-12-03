var express = require('express');
var router = express.Router();

var config = require('../my_modules/config');
var relay = require('../my_modules/relay');

var pin = config.pin;

router.post('/actions', function(req, res, next){
  //console.log(JSON.stringify(req.body.status));
  console.log(req.body);
  if (req.body.status=="Paused")
  {
    relay.act(pin.thermostat, 0, function(err){ //0=OFF
      if(err){
        console.error(err);
        return next(err);
      }
    }); 
  }
  else if (req.body.status=="Working")
  {
    relay.act(pin.thermostat, 1, function(err){ //1=ON
      if(err){
        console.error(err);
        return next(err);
      }
    }); 
  }
  res.contentType('json');
  res.send({result:'ok'});
});

// router.get('/:pin/state', function(req, res) {
//   relay.get(req.params.pin);
//   res.send(200);
// });
//
// router.get('/:pin/on', function(req, res) {
//   relay.on(req.params.pin);
//   res.send(200);
// });
//
// router.get('/:pin/off', function(req, res) {
//   relay.off(req.params.pin);
//   res.send(200);
// });
//
//
// router.get('/:pin/toggle', function(req, res) {
//   relay.toggle(req.params.pin);
//   res.send(200);
// });

module.exports = router;
