#include "Discovery.h"
#include <WiFi.h>
#include <ArduinoJson.h>

void Discovery::begin(DeviceConfig& config) {
    _config = &config;
    _udp.begin(DISCOVERY_PORT);
    Serial.println("[Discovery] Démarré");
}

void Discovery::loop() {
    if (!_config) return;
    if (WiFi.status() != WL_CONNECTED) return;

    if (millis() - _lastAnnounce > ANNOUNCE_INTERVAL) {
        _sendAnnounce();
        _lastAnnounce = millis();
    }
}

#define _BT_STR(x) #x
#define BT_STR(x) _BT_STR(x)

void Discovery::_sendAnnounce() {
    JsonDocument doc;

    doc["name"]            = _config->deviceName;
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    #ifdef BOARD_TYPE
    doc["boardType"]       = BT_STR(BOARD_TYPE);
    #else
    doc["boardType"]       = "S3_MINI";
    #endif
    doc["ledCount"]    = _config->strips[0].ledCount;
    doc["dmxUniverse"] = _config->strips[0].dmxUniverse;
    doc["dmxStartChannel"] = _config->strips[0].dmxStartChannel;
    doc["dmxMode"]     = _config->strips[0].dmxMode;
    doc["stripCount"]  = _config->stripCount;
    doc["rssi"]        = WiFi.RSSI();
    doc["ip"]          = WiFi.localIP().toString();

    String json;
    serializeJson(doc, json);

    String msg = "LED_ANNOUNCE:" + json;

    // Broadcast sur le réseau
    IPAddress broadcast = WiFi.localIP();
    broadcast[3] = 255;

    _udp.beginPacket(broadcast, DISCOVERY_PORT);
    _udp.print(msg);
    _udp.endPacket();

    Serial.printf("[Discovery] Annonce envoyée → %s\n",
                  broadcast.toString().c_str());
}