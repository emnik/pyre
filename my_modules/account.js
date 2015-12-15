var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('/home/pi/apps/pyre/sensor-data.sqlite');
var crypto = require('crypto'); //this is a native node.js module. I don't need to install anything!

function hashPassword(password, salt) {
  var hash = crypto.createHash('sha256');
  hash.update(password);
  hash.update(salt);
  return hash.digest('hex');
}

function authenticate(username, password, done) {
  db.get("SELECT salt FROM users WHERE username = ?",[username], function(err, row) {
    if (!row) return done(null, false);
    var hash = hashPassword(password, row.salt);
    db.get("SELECT username, id FROM users WHERE username = ? AND password = ?", [username, hash], function(err, row) {
      if (!row) return done(null, false);
      return done(null, row);
    });
  });
};

function serializeUser(user, done) {
  return done(null, user.id);
};

function deserializeUser(id, done) {
  db.all('SELECT id, username FROM users WHERE id = ?', id, function(err, row) {
    if (!row) return done(null, false);
    return done(null, row);
  });
};


module.exports.authenticate=authenticate;
module.exports.serializeUser=serializeUser;
module.exports.deserializeUser=deserializeUser;
// module.exports.hashPassword=hashPassword;