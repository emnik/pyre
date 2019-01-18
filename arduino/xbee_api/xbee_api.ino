// Author: Nikiforakis Manos
// Date: 20 July,2015
//
// Arduino program to read DS18b20 temperature and send the value through the Xbee module using its API mode
// Used on the remote temperature sensor for the "pyre" Raspberry based smart thermostat
//
// Libraries used:
// Xbee: https://github.com/andrewrapp/xbee-arduino
// Onewire: http://playground.arduino.cc/Learning/OneWire
// Dallas Temperature  https://github.com/milesburton/Arduino-Temperature-Control-Library
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
// TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
// DEALINGS IN THE SOFTWARE.

#include <XBee.h>  
#include <OneWire.h> 
#include <DallasTemperature.h> 

// Data wire is plugged into pin D2 on the Arduino
#define ONE_WIRE_BUS 2

int digitBuffer[2] = {0};
float temp;
float tempC;
unsigned long t = 0;  

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

XBee xbee = XBee();

// allocate 4 bytes to hold 1 float
uint8_t payload[4] = {0, 0, 0, 0};

// with Series 1 you can use either 16-bit or 64-bit addressing

// 16-bit addressing: Enter address of remote XBee, typically the coordinator
Tx16Request tx = Tx16Request(0x0001, payload, sizeof(payload));

// 64-bit addressing: This is the SH + SL address of remote XBee
//XBeeAddress64 addr64 = XBeeAddress64(0x0013a200, 0x4008b490);
// unless you have MY on the receiving radio set to FFFF, this will be received as a RX16 packet
//Tx64Request tx = Tx64Request(addr64, payload, sizeof(payload));

TxStatusResponse txStatus = TxStatusResponse();


union {
      float f;
      byte b[4];
   } stuff;

void setup() {
  Serial.begin(9600);
  xbee.setSerial(Serial);
  sensors.begin();
}


void loop() {
   t=0;
   sensors.requestTemperatures(); // Send the command to get temperatures
   // start transmitting after a startup delay.
    delay(200);
    stuff.f = sensors.getTempCByIndex(0);
    Serial.print(stuff.f);
    Serial.println();
    payload[0] = stuff.b[0];
    payload[1] = stuff.b[1];
    payload[2] = stuff.b[2];
    payload[3] = stuff.b[3];

    xbee.send(tx);
      
    delay(60000);
}


