var express = require('express');
var router = express.Router();
// var ds1820 = require('../my_modules/ds1820');


/* GET home page. */
router.get('/', function(req, res) {
  var base_url = req.headers.host;
	/*I used a global variable (app.locals.startTemp) as with the following way
	there was some delay on page refresh... probably due to asynchronous nature
	of node.js?*/
  // var firstTemp;
  // ds1820.readLocalTemp(function(data){
  // 		firstTemp = data.temperature_record[0].celsius;
  // 	});
  // var startTemp = req.param('temperature', firstTemp);
  // res.render('index', {startTemp: startTemp});
  res.render('index', {base_url:base_url});
})


module.exports = router;
