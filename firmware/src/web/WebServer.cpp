#include "WebServer.h"
#include <LittleFS.h>

void WebServer::begin(Config& config, LedController& leds,
                      Effects& effects, WiFiManager& wifi) {
    _config  = &config;
    _leds    = &leds;
    _effects = &effects;
    _wifi    = &wifi;

    LittleFS.begin(true);
    _setupRoutes();
    _server.begin();
    Serial.println("[WebServer] Démarré sur port 80");
}

void WebServer::_setupRoutes() {
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    _server.onNotFound([](AsyncWebServerRequest* req) {
        if (req->method() == HTTP_OPTIONS) {
            req->send(200);
        } else {
            req->send(404, "application/json", "{\"error\":\"not found\"}");
        }
    });

    _server.on("/api/status", HTTP_GET,
        [this](AsyncWebServerRequest* req) {
            _handleGetStatus(req);
        });

    _server.on("/api/config", HTTP_GET,
        [this](AsyncWebServerRequest* req) {
            _handleGetConfig(req);
        });

    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/config",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostConfig(req, json);
        }));

    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/wifi",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostWifi(req, json);
        }));

    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/test",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostTest(req, json);
        }));

    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/effect",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostEffect(req, json);
        }));

    _server.on("/api/reboot", HTTP_POST,
        [this](AsyncWebServerRequest* req) {
            _handleReboot(req);
        });

    _server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
}

void WebServer::_handleGetStatus(AsyncWebServerRequest* req) {
    JsonDocument doc;
    doc["name"]      = _config->data.deviceName;
    doc["ip"]        = _wifi->getIP();
    doc["rssi"]      = _wifi->getRSSI();
    doc["wifiState"] = (int)_wifi->getState();
    doc["freeHeap"]  = ESP.getFreeHeap();
    doc["uptime"]    = millis() / 1000;
    doc["firmware"]  = "1.0.0";
    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
}

void WebServer::_handleGetConfig(AsyncWebServerRequest* req) {
    JsonDocument doc;
    doc["deviceName"]      = _config->data.deviceName;
    doc["ledCount"]        = _config->data.ledCount;
    doc["dmxUniverse"]     = _config->data.dmxUniverse;
    doc["dmxStartChannel"] = _config->data.dmxStartChannel;
    doc["dmxMode"]         = _config->data.dmxMode;
    doc["dmxGroupSize"]    = _config->data.dmxGroupSize;
    doc["brightness"]      = _config->data.brightness;
    doc["fpsMax"]          = _config->data.fpsMax;
    doc["timeoutMs"]       = _config->data.timeoutMs;

    uint16_t channels = 0;
    switch (_config->data.dmxMode) {
        case 0: channels = _config->data.ledCount * 3; break;
        case 1: channels = (_config->data.ledCount / _config->data.dmxGroupSize) * 3; break;
        case 2: channels = 3; break;
    }
    doc["dmxChannelsUsed"] = channels;
    doc["dmxLastChannel"]  = _config->data.dmxStartChannel + channels - 1;

    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
}

void WebServer::_handlePostConfig(AsyncWebServerRequest* req, JsonVariant& json) {
    if (json["deviceName"].is<const char*>())
        strlcpy(_config->data.deviceName, json["deviceName"], sizeof(_config->data.deviceName));
    if (json["ledCount"].is<int>())
        _config->data.ledCount = json["ledCount"];
    if (json["dmxUniverse"].is<int>())
        _config->data.dmxUniverse = json["dmxUniverse"];
    if (json["dmxStartChannel"].is<int>())
        _config->data.dmxStartChannel = json["dmxStartChannel"];
    if (json["dmxMode"].is<int>())
        _config->data.dmxMode = json["dmxMode"];
    if (json["dmxGroupSize"].is<int>())
        _config->data.dmxGroupSize = json["dmxGroupSize"];
    if (json["brightness"].is<int>()) {
        _config->data.brightness = json["brightness"];
        _leds->setBrightness(_config->data.brightness);
    }
    if (json["fpsMax"].is<int>())
        _config->data.fpsMax = json["fpsMax"];
    if (json["timeoutMs"].is<int>())
        _config->data.timeoutMs = json["timeoutMs"];

    _config->save();
    req->send(200, "application/json", "{\"ok\":true}");
}

void WebServer::_handlePostWifi(AsyncWebServerRequest* req, JsonVariant& json) {
    if (!json["ssid"].is<const char*>()) {
        req->send(400, "application/json", "{\"error\":\"ssid requis\"}");
        return;
    }
    strlcpy(_config->data.wifiSSID, json["ssid"], sizeof(_config->data.wifiSSID));
    if (json["password"].is<const char*>())
        strlcpy(_config->data.wifiPassword, json["password"], sizeof(_config->data.wifiPassword));
    _config->save();
    req->send(200, "application/json", "{\"ok\":true,\"reboot\":true}");
    delay(1000);
    ESP.restart();
}

void WebServer::_handlePostTest(AsyncWebServerRequest* req, JsonVariant& json) {
    String mode = json["mode"] | "color";
    if (mode == "color") {
        uint8_t r = json["r"] | 255;
        uint8_t g = json["g"] | 0;
        uint8_t b = json["b"] | 0;
        _leds->setAll(r, g, b);
        _leds->show();
    } else if (mode == "rainbow") {
        _effects->setEffect(EFFECT_RAINBOW);
    } else if (mode == "off") {
        _leds->clear();
        _leds->show();
    }
    req->send(200, "application/json", "{\"ok\":true}");
}

void WebServer::_handlePostEffect(AsyncWebServerRequest* req, JsonVariant& json) {
    int type = json["type"] | 1;
    _effects->setEffect((EffectType)type);
    if (json["r"].is<int>())
        _effects->setColor(json["r"], json["g"], json["b"]);
    if (json["speed"].is<int>())
        _effects->setSpeed(json["speed"]);
    req->send(200, "application/json", "{\"ok\":true}");
}

void WebServer::_handleReboot(AsyncWebServerRequest* req) {
    req->send(200, "application/json", "{\"ok\":true}");
    delay(500);
    ESP.restart();
}