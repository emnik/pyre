1. Install NODE
cd Downloads
wget https://nodejs.org/dist/v4.3.2/node-v4.3.2-linux-armv6l.tar.gz 
tar -xvf node-v4.3.2-linux-armv6l.tar.gz 
cd node-v4.3.2-linux-armv6l
check installation with 
pi@raspberrypi:/usr $ node -v
v4.3.2
pi@raspberrypi:/usr $ npm -v
2.14.12

2. Install express-generator
sudo npm install express-generator -g

3. mkdir apps
   cd apps

4. Install git
sudo apt-get install git
git clone git://github.com/quick2wire/quick2wire-gpio-admin.git
cd quick2wire-gpio-admin
cd src
nano gpio-admin.c 
comment the line and replace with the next one 
//int size = snprintf(path, PATH_MAX, "/sys/devices/virtual/gpio/gpio%u/%s", pin, filename);
int size = snprintf(path, PATH_MAX, "/sys/class/gpio/gpio%u/%s", pin, filename); 
cd..
make
sudo make install 
sudo adduser $USER gpio

cd ~/apps
git clone https://github.com/emnik/pyre.git
cd pyre
npm install
sudo npm install forever -g
sudo npm install nodemon -g

ls /sys/bus/w1/devices
MARK your sensor's 28-xxx number!
nano /home/pi/apps/pyre/my_modules/ds1820.js and in line 10 replace the 28-xxx number with your sensors'!

from /home/pi/apps/pyre you can start the app by:
nodemon bin/www --debug
[stop with CTRL+C]
or
forever start bin/www --killSignal=SIGTERM
[stop with forever stop bin/www]




