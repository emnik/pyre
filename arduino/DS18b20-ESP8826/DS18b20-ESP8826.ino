#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Data wire is plugged into pin 2 on the Arduino
#define ONE_WIRE_BUS D2

// Setup a oneWire instance to communicate with any OneWire devices 
// (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);

DallasTemperature sensors(&oneWire);

// Update these with values suitable for your network.
const char* ssid = "ciscosb1";
const char* password = "pyrovolakis2@myHOME";
const int   mqtt_port = 1883;
const char* mqtt_server = "10.185.9.113";
const char* mqtt_user = "mosquitto";
const char* mqtt_password = "pyre2017";
const char* temperature_topic = "pyre/1";

WiFiClient espClient;
PubSubClient client(espClient);
long lastMsg = 0;
float temp = 0;

void setup_wifi() {
  delay(10);
  // We start by connecting to a WiFi network
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid); //We don't want the ESP to act as an AP
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) 
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

 
void setup()
{
  Serial.begin(115200);
  setup_wifi(); 
  client.setServer(mqtt_server, mqtt_port);
}

void loop()
{
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  long now = millis();
  if (now - lastMsg > 30000) {
    lastMsg = now;
    sensors.setResolution(9);
    do {
      sensors.requestTemperatures(); // Send the command to get temperatures
      temp = sensors.getTempCByIndex(0);
      delay(100);
    } while (temp >= 85.00); //85 is the indicator value of a >false< reading. It ususally is the first reading on powerON.
    client.publish(temperature_topic, String(temp).c_str(), true);
    Serial.println(temp);
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    // If you do not want to use a username and password, change next line to
    // if (client.connect("ESP8266Client")) {
    if (client.connect("ESP8266Client", mqtt_user, mqtt_password)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}
