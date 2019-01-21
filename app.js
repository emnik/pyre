var express = require('express')
var path = require('path')
// var favicon = require('serve-favicon')
// var logger = require('morgan')
// var cookieParser = require('cookie-parser')
var bodyParser = require('./node_modules/express/node_modules/body-parser')
var partials = require('express-partials')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy

var routes = require('./routes/index')
var relay = require('./routes/relay')
// var therm = require('./routes/therm')
var edit = require('./routes/edit')
var config = require('./routes/config')
var pyre = require('./routes/pyre')

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// uncomment after placing your favicon in /public
// app.use(favicon(__dirname + '/public/favicon.ico'))
// app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}))
// app.use(cookieParser());
app.use(require('express-session')({
  secret: 'smarthouse',
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

app.use(express.static(path.join(__dirname, 'public')))
app.use(partials())

app.use('/', routes)
app.use('/relay', relay)
app.use('/edit', edit)
// app.use('/therm', therm)
app.use('/config', config)
app.use('/pyre', pyre)

/* Usually, you don't want to expose any of your internal paths for how your server is structured
to the outside world. What you can is make a /scripts static route in your server that fetches its
files from "./node_modules/bootstrap/dist/". Then, the script tag in your pages just looks like this:
<script src="/scripts/bootstrap.min.js"></script>
*/
app.use('/bootstrap', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/')))
app.use('/jquery', express.static(path.join(__dirname, '/node_modules/jquery/dist/')))
app.use('/bootstrap-toggle', express.static(path.join(__dirname, '/node_modules/bootstrap-toggle/')))
app.use('/bootstrap-touchspin', express.static(path.join(__dirname, '/node_modules/bootstrap-touchspin/dist/')))
app.use('/bootstrap-slider', express.static(path.join(__dirname, '/node_modules/bootstrap-slider/dist/')))
app.use('/select2', express.static(path.join(__dirname, '/node_modules/select2/dist/')))
app.use('/pickadate', express.static(path.join(__dirname, '/node_modules/pickadate/lib/')))
app.use('/object-hash', express.static(path.join(__dirname, '/node_modules/object-hash/dist/')))
app.use('/chart.js', express.static(path.join(__dirname, '/node_modules/chart.js/dist/')))

// passport config
var account = require('./my_modules/account')
passport.use(new LocalStrategy(account.authenticate))
passport.serializeUser(account.serializeUser)
passport.deserializeUser(account.deserializeUser)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})


module.exports = app
