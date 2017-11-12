// Author: Nikiforakis Manos
// Date: 20 July,2015
//
// Arduino program to read DS18b20 temperature, show it on the 4 digit 7-Segment LED module
// and send the value through the Xbee module using its API mode
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

const int latchPin = 6; // connect Arduino's pin D6 to RCLK pin of the 4 digit 7-Segment LED module
const int clockPin = 5; // connect Arduino's pin D5 to SCLK pin of the 4 digit 7-Segment LED module
const int dataPin = 4;  // connect Arduino's pin D4 to DIO pin of the 4 digit 7-Segment LED module

byte col[4] = {
  B10000000, //digit 1 
  B01000000, //digit 2
  B00100000, //digit 3
  B00010000  //digit 4 -the left most
};

/* A SEGMENT WITH 7 BITS TO FORM A DIGIT
   LSBFIRST REPRESENTATION
      
     --a--
   f|     |b
     --g--
   e|     |c
     --d--  .h
      
*/

byte dig[14] = {
//Babcdefgh 0=ON, 1=OFF, B stands for Binary
  B00000011, //0
  B10011111, //1
  B00100101, //2
  B00001101, //3
  B10011001, //4
  B01001001, //5
  B01000001, //6
  B00011111, //7
  B00000001, //8
  B00001001, //9
  B00010001, //A
  B00000001, //B - same as 8
  B11100101, //c
  B11111110  //.
};     

int digitBuffer[2] = {0};
float temp;
float tempC;
unsigned long t = 0;  

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

XBee xbee = XBee();

unsigned long start = millis();

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
  pinMode(latchPin, OUTPUT) ;
  pinMode(clockPin, OUTPUT) ;
  pinMode(dataPin, OUTPUT) ;
  Serial.begin(9600);
  xbee.setSerial(Serial);
  sensors.begin();
}

void updateDisp(){
  for(int j=3; j>0; j--)  {
      digitalWrite(latchPin, LOW); 
      
      if (j==2){ 
        shiftOut(dataPin, clockPin, LSBFIRST, (dig[digitBuffer[j-1]]&dig[13]));
        shiftOut(dataPin, clockPin, LSBFIRST, col[j]);
      }
      else
      {
        shiftOut(dataPin, clockPin, LSBFIRST, dig[digitBuffer[j-1]]);
        shiftOut(dataPin, clockPin, LSBFIRST, col[j]);
      };    
      digitalWrite(latchPin, HIGH); 
      delay(2);
  }
  digitalWrite(latchPin, LOW); 
  shiftOut(dataPin, clockPin, LSBFIRST, dig[12]); //c : celcius
  shiftOut(dataPin, clockPin, LSBFIRST, col[0]); 
  digitalWrite(latchPin, HIGH);
  delay(2);
}



void loop() {
   t=0;
   sensors.requestTemperatures(); // Send the command to get temperatures
   // start transmitting after a startup delay.  Note: this will rollover to 0 eventually so not best way to handle
    if (millis() - start >15000) {
      stuff.f = sensors.getTempCByIndex(0);
      Serial.print(stuff.f);
      Serial.println();
      payload[0] = stuff.b[0];
      payload[1] = stuff.b[1];
      payload[2] = stuff.b[2];
      payload[3] = stuff.b[3];

      xbee.send(tx); //with all the delays we send data at ~ every 10 sec
      
      //delay(2000); // Instead of a delay we use a for loop to show the temperature value on the led tube module 
      temp = stuff.f;
      tempC = int(temp*10);
      digitBuffer[2] = int(tempC)/100; //hundrends
      digitBuffer[1] = (int(tempC)%100)/10; //tens
      digitBuffer[0] = (int(tempC)%100)%10;//units
      for (t;t<6000;t++) 
      {
        updateDisp();
        //delay(2);
      };      
   }
}


