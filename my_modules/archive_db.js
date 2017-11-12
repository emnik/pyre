/* Using the sqlite3-transactions.js from ../my_modules which I've downloaded from  https://github.com/Strix-CZ/sqlite3-transactions.
This is because the npm downloaded version although it has the same version number, it is not the same with the one at github.
The github uses the util module instead of the sys module which is deprecated...
Until this is solved I included the sqlite3-transactions.js in the project!!!
I've also removed the dependancy: "sqlite3-transactions": "~0.0.5" from the package.json!
and added the "underscore": "1.8.3" dependancy which is needed by the sqlite3-transactions module!
*/

var sqlite3 = require('sqlite3').verbose(),
	TransactionDatabase = require("../my_modules/sqlite3-transactions").TransactionDatabase;
	// TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;

// Wrap sqlite3 database
var db = new TransactionDatabase(
    new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

function get_data_to_archive(callback){
	var sql = 	"SELECT sensor_id, "+
				"datetime((timestamp/1000)/86400*86400, 'unixepoch', 'localtime') as localtime, "+
				"strftime('%Y-%m-%d',(timestamp/1000)/86400*86400, 'unixepoch', 'localtime') as date, "+
				"ROUND(avg(value),2) as temp "+ //this will be value in the sensor_history table
				"FROM sensor_data "+
				"WHERE timestamp/1000 < ((strftime('%s', 'now') - strftime('%S', 'now') + strftime('%f', 'now'))-3600*24) "+
				"GROUP BY sensor_id, localtime, sensor_id "+
				"ORDER BY localtime ASC;";

	db.all(sql, function(err, rows){
		if(err){
			// console.log(err);
			return callback(err,null);
		}
		var data = rows;
		callback(null,data);
	})
}

function archive_database(callback){
	get_data_to_archive(function(err,data){
		if (err){
			// console.error(err);
			return callback(err);
		}
		// Begin a transaction.
		db.beginTransaction(function(err, transaction) {
		    // Now we are inside a transaction.
		    // Use transaction as normal sqlite3.Database object.
		    for (var i = 0; i<=data.length - 1; i++) {
		    	transaction.run("INSERT INTO sensor_history (date, sensor_id, value) VALUES (?, ?, ?)",[data[i].date, data[i].sensor_id, data[i].temp]);
		    };
		    transaction.run("DELETE FROM sensor_data WHERE timestamp/1000 < ((strftime('%s', 'now') - strftime('%S', 'now') + strftime('%f', 'now'))-3600*24)");
		    // commit
		    transaction.commit(function(err) {
            	if (err) {
            		return callback(err);
            	}
            	callback(null);
        	})
		})
	})
}

module.exports.archive_database = archive_database;
