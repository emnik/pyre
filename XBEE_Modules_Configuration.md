###Configuration of the XBEE modules
####1 Coordinator - 1 or more End Devices
1. Download the X-CTU software from www.digi.com/products/xbee-rf-solutions/xctu-software/xctu
2. Use an Xbee Explorer or an FTDI Module (3.3V) to connect the Xbee to the PC
3. Set up the XBees (one by one) with the following configuration:

Parameter | Coordinator | End Device 1 | End Device 2 | ...
:--------:|:-----------:|:------------:|:------------:|:-------:
ID        |     3332    |      3332    |     3332     | 3332
MY        |      1      |       2      |       3      |   4
CE        |      1      |       0      |       0      |   0
AP        |      2      |       2      |       2      |   2

