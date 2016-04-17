Connect via ssh to Pi

1. Set up the DSB18b20 temperature sensor

sudo nano /boot/config.txt and at the bottom add:
	dtoverlay=w1-gpio

then reboot, reconnect via ssh and run:
sudo modprobe w1-gpio
sudo modprobe w1-therm
cd /sys/bus/w1/devices
ls
cd 28-xxxx (change this to match what serial number pops up)
cat w1_slave

if the output is as follows :
a8 01 4b 46 7f ff 08 10 de : crc=de YES
a8 01 4b 46 7f ff 08 10 de t=26500

then the sensor if working fine and we can set it up to load the modules on boot:

sudo nano /etc/modules
and add:
w1-gpio
w1-therm

then reboot

2. Setup the RTC module
 
sudo apt-get install python-smbus
sudo apt-get install i2c-tools
pi@raspberrypi:~ $ sudo i2cdetect -y 1
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:          -- -- -- -- -- -- -- -- -- -- -- -- -- 
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
30: -- -- -- -- -- -- -- -- UU -- -- -- -- -- -- -- 
40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
60: -- -- -- -- -- -- -- -- 68 -- -- -- -- -- -- -- 
70: -- -- -- -- -- -- -- -- 
If the output is as above:
sudo modprobe rtc-ds130
sudo bash
echo ds1307 0x68 > /sys/class/i2c-adapter/i2c-1/new_device7
exit

check the date and time via the date command and if it is right  run
sudo hwclock -w
to write the time to the RTC
check with
sudo hwclock -r
To add the RTC module to the kernel run
sudo nano /etc/modules
and add
rtc-ds1307

then sudo nano /etc/rc.local
and add:
echo ds1307 0x68 > /sys/class/i2c-adapter/i2c-1/new_device
sudo hwclock -s
before exit 0.

3. Disable the Pi's Serial Console to be able to use it with the Xbee
For Rpi B+/2: we have already disabled the serial from raspi-config
For Rpi 3: We also need to sudo nano /boot/config.txt and Add at the end of the file:
    dtoverlay=pi3-miniuart-bt
*the downside is that with this we disable the bluetooth of Rpi that it also uses the TX/RX gpio pins!
then reboot


