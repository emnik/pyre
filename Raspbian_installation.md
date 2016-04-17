###Raspbian (Currently Jessie) Installation and Configuration
1. download the Raspbian Image with PiTFT support from Adafruit (Currently Jessie): <https://learn.adafruit.com/adafruit-2-8-pitft-capacitive-touch/easy-install>

2. Unzip and Copy the image to the SD Card via dd: <http://elinux.org/RPi_Easy_SD_Card_Setup>

3. Connect the Pi with an ethernt cable to the PC, run `nm-connection-editor` -> Add -> Ethernet
Name the connection RPiLocal and on the IPv4 Settings tab choose "Shared to other computers" click Save and the connection will initiate

4. See the PC's IP of the wired connection via `ifconfig`:
```
manos@dell:~$ ifconfig
enp1s0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.42.0.1  netmask 255.255.255.0  broadcast 10.42.0.255
...
```

5. run `nmap -sP 10.42.0.*`
```
Starting Nmap 7.12 ( https://nmap.org ) at 2016-04-17 16:28 EEST
Nmap scan report for 10.42.0.1
Host is up (0.00040s latency).
Nmap scan report for 10.42.0.151
Host is up (0.00046s latency).
Nmap done: 256 IP addresses (2 hosts up) scanned in 3.01 seconds
```
the 10.42.0.151 is the RPi's IP

6. SSH to the Pi as user pi with password raspberry
```
manos@dell:~$ ssh pi@10.42.0.151
The authenticity of host '10.42.0.151 (10.42.0.151)' can't be established.
ECDSA key fingerprint is %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%.
ECDSA key fingerprint is %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '10.42.0.151' (ECDSA) to the list of known hosts.
pi@10.42.0.151's password: 
pi@raspberrypi:~ $ 
```

7. `sudo raspi-config` to configure the Pi
  * Choose Expand Filesystem
  * Internationalisation Options > Change Locale > en_US.UTF-8 UTF-8 > OK and choose the en_US.UTF-8 as default
  * Internationalisation Options > Change TimeZone > Europe > Athens > OK
  * Advanced options > I2C > Enable (Yes > OK) > Loaded by default (YES > OK)
  * Advanced options > Serial > No > OK
*It may ask to reboot when changing any of the above. Reboot, reconnect via ssh and continue with the rest...*

8. SSH again to the RPi and run:
```
pi@raspberrypi ~ $ sudo apt-get update
pi@raspberrypi ~ $ sudo apt-get install tightvncserver
pi@raspberrypi ~ $ vncserver :1
Log file is /home/pi/.vnc/raspberrypi:1.log
```
setup and verify a password for connecting to VNC and answer NO to the a view-only password.

Then you can connect to the Pi via a Remote Desktop Viewer application using the 10.42.0.151:1 as host address. 
Now you can setup a Wifi connection or keep the Ethernet connection if you want!


