var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var partials = require('express-partials');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


var routes = require('./routes/index');
var relay = require('./routes/relay');
var therm = require('./routes/therm');
var edit = require('./routes/edit');
var config = require('./routes/config');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'smarthouse',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(partials());

app.use('/', routes);
app.use('/relay', relay);
app.use('/edit', edit);
app.use('/therm', therm);
app.use('/config', config);


// var crypto = require('crypto');
// var salt = crypto.randomBytes(16).toString('hex');
// console.log(salt);
// var sha = account.hashPassword('usr#6379', salt);
// console.log(sha);

// passport config
var account = require('./my_modules/account');
passport.use(new LocalStrategy(account.authenticate));
passport.serializeUser(account.serializeUser);
passport.deserializeUser(account.deserializeUser);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



module.exports = app;
