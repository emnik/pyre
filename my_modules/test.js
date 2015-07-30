var com = require("serialport");

var serialPort = new com.SerialPort("/dev/ttyAMA0", {
    baudrate: 9600,
    parser: com.parsers.raw
  });

serialPort.on('open',function() {
  console.log('Port open');
});

serialPort.on('data', function(data) {
	console.log(data);
	var l = data.length;
	if (l % 5 ==0)
	{
		console.log(data.readFloatLE(0));
	}
});