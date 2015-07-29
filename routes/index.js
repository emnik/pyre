var express = require('express');
var router = express.Router();
// var ds1820 = require('../my_modules/ds1820');


/* GET home page. */
router.get('/', function(req, res) {
	/*I used a global variable (app.locals.startTemp) as with the following way
	there was some delay on page refresh... probably due to asynchronous nature
	of node.js?*/
  // var firstTemp;
  // ds1820.readLocalTemp(function(data){
  // 		firstTemp = data.temperature_record[0].celsius;
  // 	});
  // var startTemp = req.param('temperature', firstTemp);
  // res.render('index', {startTemp: startTemp});
  res.render('index');
})


module.exports = router;
