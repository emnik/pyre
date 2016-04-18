###Installation of the software

1. Install NODE

 ```
 cd Downloads
 wget https://nodejs.org/dist/v4.3.2/node-v4.3.2-linux-armv6l.tar.gz 
 tar -xvf node-v4.3.2-linux-armv6l.tar.gz 
 cd node-v4.3.2-linux-armv6l
 sudo cp -R * /usr/local/
 ```
 check installation with 
 ```
 pi@raspberrypi:/usr $ node -v
 v4.3.2
 pi@raspberrypi:/usr $ npm -v
 2.14.12
 ```
2. Install express-generator
`sudo npm install express-generator -g`

3. Prepare the directories
 ```
 mkdir apps
 cd apps
 ```
4. Install git (if you haven't already)
 `sudo apt-get install git`

5. Install and compile quickwire

 `git clone git://github.com/quick2wire/quick2wire-gpio-admin.git`

 *Before we compile it we have to change one line in the code:*
 ```
 cd quick2wire-gpio-admin
 cd src
 nano gpio-admin.c 
 ```
 comment the line and replace with the next one 
 ```
 //int size = snprintf(path, PATH_MAX, "/sys/devices/virtual/gpio/gpio%u/%s", pin, filename);
 int size = snprintf(path, PATH_MAX, "/sys/class/gpio/gpio%u/%s", pin, filename); 
 ```
Save the file and then compile it and install it:
 ```
 cd..
 make
 sudo make install 
 sudo adduser $USER gpio
 ```

6. Install Pyre
 ```
 cd ~/apps
 git clone https://github.com/emnik/pyre.git
 cd pyre
 cp database-init/sensor-data.sqlite .
 mkdir node_modules
 npm install
 sudo npm install forever -g
 sudo npm install nodemon -g
 ```
 Then `ls /sys/bus/w1/devices` and MARK your sensor's **28-xxx** number!
 `nano /home/pi/apps/pyre/my_modules/ds1820.js` and in line 10 replace the **28-xxx** number with your sensors'!

7. Start / Stop Pyre

 **From /home/pi/apps/pyre** you can start the app with:
 `nodemon bin/www --debug`

 [stop with CTRL+C]

 or

 `forever start bin/www --killSignal=SIGTERM`

 [stop with `forever stop bin/www`]





