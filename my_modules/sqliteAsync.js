//this module wraps the sqlite3 basic functions through Promises so that I can use the await async 
//functionality with the sqlite3 in node.js!
 
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.cached.Database('/home/pi/apps/pyre/sensor-data.sqlite')

function getAsync (sql) {
  return new Promise(function (resolve, reject) {
      db.get(sql, function (err, row) {
          if (err)
              reject(err);
          else
              resolve(row);
      });
  });
};

function allAsync (sql) {
  return new Promise(function (resolve, reject) {
      db.all(sql, function (err, rows) {
          if (err)
              reject(err);
          else
              resolve(rows);
      });
  });
};

function runAsync (sql) {
  return new Promise(function (resolve, reject) {
      db.run(sql, function(err) {
          if (err)
              reject(err);
          else
              resolve(this.lastID);
      });
  })
};

module.exports.getAsync = getAsync
module.exports.allAsync = allAsync
module.exports.runAsync = runAsync
module.exports.db = db