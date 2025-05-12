#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h> // Add mDNS library for device discovery

// WiFi credentials
const char *ssid = "CLOSETHEDOOR";
const char *password = "Satukomatiga";

// Server settings
const char *serverUrl = "http://192.168.1.8:3000"; // Change this to your server's IP address
const int updateInterval = 2000;                   // Update interval in milliseconds

// Pin definitions
// Original hardware pins (commented out for now)
// const int LIGHT_PIN = 2; // LED for night light
// const int AROMA_PIN = 4; // For aromatherapy control
// const int MUSIC_PIN = 5; // For music control (or audio indicator)

// Using built-in LED for testing
const int BUILTIN_LED = 2; // Most ESP32 boards use GPIO 2 for built-in LED

// Device state
bool lightState = false;
bool aromaState = false;
bool musicState = false;
String currentSong = "rainforest";
int volumeLevel = 50;

// Device identifier - make it unique for each device
String deviceName = "SWELL_LAMP";
String deviceType = "smart_lamp";
String deviceModel = "ESP32";

// Timestamp for last update
unsigned long lastUpdateTime = 0;

void setup()
{
    Serial.begin(115200);

    // Initialize pins
    // pinMode(LIGHT_PIN, OUTPUT);
    // pinMode(AROMA_PIN, OUTPUT);
    // pinMode(MUSIC_PIN, OUTPUT);
    pinMode(BUILTIN_LED, OUTPUT); // Initialize built-in LED

    // Connect to WiFi
    WiFi.begin(ssid, password);

    Serial.println("Connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());

    // Initialize mDNS responder
    if (MDNS.begin("swelldevice"))
    {
        Serial.println("mDNS responder started");
        // Add service to mDNS
        MDNS.addService("swell", "tcp", 80);
        // Add device info as TXT records
        MDNS.addServiceTxt("swell", "tcp", "name", deviceName);
        MDNS.addServiceTxt("swell", "tcp", "type", deviceType);
        MDNS.addServiceTxt("swell", "tcp", "model", deviceModel);
    }
    else
    {
        Serial.println("Error setting up mDNS responder!");
    }

    // Register with server on startup
    registerWithServer();

    // Initial state - all off
    updateOutputs();
}

void loop()
{
    // Remove the MDNS.update() call as it's not supported in ESP32 Arduino core 3.2.0
    // The mDNS service is now managed internally by the ESP32 system

    // Check if WiFi is still connected
    if (WiFi.status() == WL_CONNECTED)
    {
        // Check if it's time to update
        unsigned long currentTime = millis();
        if (currentTime - lastUpdateTime >= updateInterval)
        {
            lastUpdateTime = currentTime;

            // Get the latest settings from server
            getDeviceState();

            // Apply the settings
            updateOutputs();
        }
    }
    else
    {
        // Try to reconnect to WiFi
        Serial.println("WiFi disconnected. Reconnecting...");
        WiFi.reconnect();
    }

    // Other processing can happen here
    delay(100);
}

void getDeviceState()
{
    HTTPClient http;

    // Specify request destination with device ID
    String url = String(serverUrl) + "/api/esp32/status/" + WiFi.macAddress();
    http.begin(url);

    // Send GET request
    int httpCode = http.GET();

    // Check the returning code
    if (httpCode > 0)
    {
        if (httpCode == HTTP_CODE_OK)
        {
            String payload = http.getString();
            Serial.println("Server response: ");
            Serial.println(payload);

            // Parse JSON response
            DynamicJsonDocument doc(1024);
            deserializeJson(doc, payload);

            // Update device state
            lightState = doc["light"];
            aromaState = doc["aroma"];
            musicState = doc["music"]["active"];
            currentSong = doc["music"]["song"].as<String>();
            volumeLevel = doc["music"]["volume"];
        }
    }
    else
    {
        Serial.println("Error on HTTP request");
    }

    http.end(); // Free resources
}

void updateOutputs()
{
    // Original hardware control (commented out for now)
    // digitalWrite(LIGHT_PIN, lightState ? HIGH : LOW);
    // digitalWrite(AROMA_PIN, aromaState ? HIGH : LOW);
    // digitalWrite(MUSIC_PIN, musicState ? HIGH : LOW);

    // For testing with built-in LED:
    // Turn on LED if any feature is activated
    bool anyFeatureActive = lightState || aromaState || musicState;
    digitalWrite(BUILTIN_LED, anyFeatureActive ? HIGH : LOW);

    // Alternative: Use built-in LED only for night light feature
    // digitalWrite(BUILTIN_LED, lightState ? HIGH : LOW);

    // Debug output
    Serial.println("Current state:");
    Serial.print("Light: ");
    Serial.println(lightState ? "ON" : "OFF");
    Serial.print("Aroma: ");
    Serial.println(aromaState ? "ON" : "OFF");
    Serial.print("Music: ");
    Serial.println(musicState ? "ON" : "OFF");
    Serial.print("Song: ");
    Serial.println(currentSong);
    Serial.print("Volume: ");
    Serial.println(volumeLevel);

    // Add indicator for testing
    Serial.print("Built-in LED: ");
    Serial.println(anyFeatureActive ? "ON" : "OFF");
}

// Function to send status update to server if needed
void sendStatusUpdate()
{
    HTTPClient http;

    // Specify request destination
    String url = String(serverUrl) + "/api/esp32/update";
    http.begin(url);

    // Specify content-type header
    http.addHeader("Content-Type", "application/json");

    // Create JSON payload
    DynamicJsonDocument doc(1024);
    doc["light"] = lightState;
    doc["aroma"] = aromaState;
    doc["music"]["active"] = musicState;
    doc["music"]["song"] = currentSong;
    doc["music"]["volume"] = volumeLevel;

    String requestBody;
    serializeJson(doc, requestBody);

    // Send POST request
    int httpCode = http.POST(requestBody);

    // Check the returning code
    if (httpCode > 0)
    {
        if (httpCode == HTTP_CODE_OK)
        {
            String response = http.getString();
            Serial.println("Status update successful");
        }
    }
    else
    {
        Serial.println("Error on HTTP request");
    }

    http.end(); // Free resources
}

// Register device with the server
void registerWithServer()
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    HTTPClient http;

    // Specify request destination
    String url = String(serverUrl) + "/api/esp32/register";
    http.begin(url);

    // Specify content-type header
    http.addHeader("Content-Type", "application/json");

    // Create JSON payload with device info
    DynamicJsonDocument doc(1024);
    doc["deviceId"] = WiFi.macAddress();
    doc["deviceName"] = deviceName;
    doc["deviceType"] = deviceType;
    doc["deviceModel"] = deviceModel;
    doc["ipAddress"] = WiFi.localIP().toString();

    String requestBody;
    serializeJson(doc, requestBody);

    // Send POST request
    int httpCode = http.POST(requestBody);

    // Check the returning code
    if (httpCode > 0)
    {
        if (httpCode == HTTP_CODE_OK)
        {
            String response = http.getString();
            Serial.println("Device registered with server successfully");
        }
    }
    else
    {
        Serial.println("Error registering with server");
    }

    http.end(); // Free resources
}
