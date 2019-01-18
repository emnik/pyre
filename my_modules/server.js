#!/usr/bin/env node

// loading the express and http framework
var app = require('../app')
var http = require('http')

var port = normalizePort(process.env.PORT || '3000')
app.set('port', port)

var server = http.createServer(app);
// server.listen(3000);

server.on('error', onError)
server.on('listening', onListening)

var io = require('socket.io').listen(server.listen(port))

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort (val) {
    var port = parseInt(val, 10)
  
    if (isNaN(port)) {
      // named pipe
      return val
    }
    if (port >= 0) {
      // port number
      return port
    }
    return false
  }

/**
 * Event listener for HTTP server "error" event.
 */

function onError (error) {
    if (error.syscall !== 'listen') {
      throw error
    }
  
    var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port
  
    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges')
        process.exit(1)
      case 'EADDRINUSE':
        console.error(bind + ' is already in use')
        process.exit(1)
      default:
        throw error
    }
  }
  
  /**
   * Event listener for HTTP server "listening" event.
   */
  
  function onListening () {
    var addr = server.address()
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port
    // debug('Listening on ' + bind);
    console.log('Listening on ' + bind)
  
    // Send a message to console
    console.log('Server up and running!')
  }
  
/**
 * use sockets.io to emit current temperatures every 1min to anyone who wants it!
 */

io.sockets.on('connection', function (socket) {
 
  socket.on('working_data', function (data) {
    // a client sent a hash based on its working data to the server so we broadcast it to others to check their status!
    // console.log('server got an update on the current data - will broadcast to all clients')
    socket.broadcast.emit('check_data', data)
  })

  socket.on('newtemp', function (data) {
    // console.log('server got an update of target temp - will broadcast to all clients')
    socket.broadcast.emit('new_target', {
      newtemp: data.newtemp
    })
  })

  socket.on('newstatus', function (data){
    console.log('server got an update of status - will broadcast to all clients')
    socket.broadcast.emit('curstate', {
      curstate: data.curstate
    })
  })

})



module.exports.io = io;
