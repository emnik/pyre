var mqtt = require('mqtt');

// MQTT setup
var mqttclient  = mqtt.connect({
     host: 'localhost',
     port: 1883,
     username:'mosquitto',
     password:'pyre2017',
     reconnectPeriod: 5000
   });

mqttclient.on('offline', function () {
  console.error('the MQTT server is offline!');
})

mqttclient.on('reconnect', function () {
  console.log("trying to reconnect to mqtt server...");
});

mqttclient.on('error', function () {
  mqttclient.end();
});

mqttclient.on('connect', function (connack) {
  console.log(connack);
  mqttclient.subscribe('pyre/#', function(err, granded){
    if(err){
      console.error(err);
    }
    else {
      console.log(granded);
      mqttclient.publish('pyre', 'Hello mqtt');
    }
  });
})


mqttclient.on('message', function (topic, message) {
  // message is Buffer
  var test = topic.toString().split('/');
  if(test.length>1){
    console.log('sensor uid:'+test[1]);
  }
  else console.log(test[0]);

  console.log(message.toString());
  // mqttclient.end();
})
