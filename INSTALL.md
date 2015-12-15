#Install everything needed for Pyre to work

**Install the Raspbian image**
Install the Raspbian image provided by adafruit in https://learn.adafruit.com/adafruit-2-8-pitft-capacitive-touch/easy-install
(Although it is supposed to work immediatly I had to run: <sudo adafruit-pitft-helper -t 28c> to get the touch to work. The screen was working ok!)

**Install node.js on the Raspberry Pi**
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
check the installation with the commands:
node -v
npm -v
both should print their version number

**Install OneWire support to the Raspberry**
sudo nano /boot/config.txt
at the end add:
dtoverlay=w1-gpio
Then reboot with sudo reboot.
sudo modprobe w1-gpio
sudo modprobe w1-therm
cd /sys/bus/w1/devices
ls
cd 28-xxxx (change this to match what serial number pops up)
cat w1_slave
the temperature will be at the end of the second line, in 1/1000 degrees C
If this works add the following modules to /etc/modules
w1-gpio
w1-therm


**Configure the serial console so we can access /dev/ttyAMA0 via the serialport node module to get the xbee remote data!**
1.Make sure your userid (default is pi) is a member of the dialout group. 
To access the /dev/ttyAMA0:
sudo usermod -a -G dialout pi

2. You need to stop the getty running on the GPIO serial console.

To do this you need 
- remove references to /dev/ttyAMA0 from /boot/cmdline.txt - which sets up the serial console on boot.

In my case old contents:
dwc_otg.lpm_enable=0 console=ttyAMA0,115200 kgdboc=ttyAMA0,115200 console=tty1 root=/dev/mmcblk0p2 rootfstype=ext4 rootwait

and new contents:
dwc_otg.lpm_enable=0 console=tty1 root=/dev/mmcblk0p2 rootfstype=ext4 rootwait

Also you need to disable the getty on that serial port in /etc/inittab
Comment out the following line
# 2 : 23 : respawn:/sbin/getty -L ttyAMA0 115200 vt100


**Download the quick2wire-gpio-admin (needed to control the gpios as a user and is required by the pi-gpio node module used in our code**
mkdir /home/pi/apps
cd /home/pi/apps
git clone git://github.com/quick2wire/quick2wire-gpio-admin.git
cd quick2wire-gpio-admin
cd src
nano gpio-admin.c
comment the line and replace with the next one
/*int size = snprintf(path, PATH_MAX, "/sys/devices/virtual/gpio/gpio%u/%s", pin, filename);*/
int size = snprintf(path, PATH_MAX, "/sys/class/gpio/gpio%u/%s", pin, filename);
save the file with CTRL+X 
make
sudo make install
sudo adduser $USER gpio

**Install the RTC support [optional] if an RTC module is installed**
...

**Download the pyre code**
mkdir /home/pi/apps/pyre
cd /home/pi/apps/pyre
git clone https://github.com/emnik/pyre.git
npm install
