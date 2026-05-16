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
    DefaultHeaders::Instance().addHeader(
        "Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader(
        "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    DefaultHeaders::Instance().addHeader(
        "Access-Control-Allow-Headers", "Content-Type");

    _server.onNotFound([](AsyncWebServerRequest* req) {
        if (req->method() == HTTP_OPTIONS) req->send(200);
        else req->send(404, "application/json", "{\"error\":\"not found\"}");
    });

    _server.on("/api/status", HTTP_GET,
        [this](AsyncWebServerRequest* req) { _handleGetStatus(req); });

    _server.on("/api/config", HTTP_GET,
        [this](AsyncWebServerRequest* req) { _handleGetConfig(req); });

    _server.addHandler(new AsyncCallbackJsonWebHandler("/api/config",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostConfig(req, json); }));

    _server.addHandler(new AsyncCallbackJsonWebHandler("/api/wifi",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostWifi(req, json); }));

    _server.addHandler(new AsyncCallbackJsonWebHandler("/api/test",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostTest(req, json); }));

    _server.addHandler(new AsyncCallbackJsonWebHandler("/api/effect",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            _handlePostEffect(req, json); }));

    _server.on("/api/reboot", HTTP_POST,
        [this](AsyncWebServerRequest* req) { _handleReboot(req); });

    _server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
}

// ─── GET /api/status ──────────────────────────────────────────────────────────
void WebServer::_handleGetStatus(AsyncWebServerRequest* req) {
    JsonDocument doc;
    doc["name"]      = _config->data.deviceName;
    doc["ip"]        = _wifi->getIP();
    doc["rssi"]      = _wifi->getRSSI();
    doc["wifiState"] = (int)_wifi->getState();
    doc["freeHeap"]  = ESP.getFreeHeap();
    doc["uptime"]    = millis() / 1000;
    doc["firmware"]  = "2.0.0";
    doc["stripCount"]= _config->data.stripCount;

    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
}

// ─── GET /api/config ──────────────────────────────────────────────────────────
void WebServer::_handleGetConfig(AsyncWebServerRequest* req) {
    JsonDocument doc;

    doc["deviceName"] = _config->data.deviceName;
    doc["brightness"] = _config->data.brightness;
    doc["fpsMax"]     = _config->data.fpsMax;
    doc["timeoutMs"]  = _config->data.timeoutMs;
    doc["stripCount"] = _config->data.stripCount;

    JsonArray strips = doc["strips"].to<JsonArray>();

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        StripConfig& s = _config->data.strips[i];
        JsonObject   o = strips.add<JsonObject>();

        o["index"]           = i;
        o["enabled"]         = s.enabled;
        o["pin"]             = s.pin;
        o["name"]            = s.name;
        o["ledCount"]        = s.ledCount;
        o["dmxUniverse"]     = s.dmxUniverse;
        o["dmxStartChannel"] = s.dmxStartChannel;
        o["dmxMode"]         = s.dmxMode;
        o["dmxGroupSize"]    = s.dmxGroupSize;
        o["universe2"]       = s.universe2;
        o["universe2StartCh"]= s.universe2StartCh;
        o["universe2LedStart"]=s.universe2LedStart;
        o["universeMode"]    = s.universeMode;

        // Calculs automatiques
        o["totalChannels"]   = s.totalChannels();
        o["lastChannel"]     = s.lastChannel();
        o["u2LedStartCalc"]  = s.calcUniverse2LedStart();
        o["u1Skip"]          = s.calcUniverse1Skip();
    }

    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
}

// ─── POST /api/config ─────────────────────────────────────────────────────────
void WebServer::_handlePostConfig(AsyncWebServerRequest* req,
                                   JsonVariant& json) {
    // Config globale
    if (json["deviceName"].is<const char*>())
        strlcpy(_config->data.deviceName,
                json["deviceName"], sizeof(_config->data.deviceName));
    if (json["brightness"].is<int>()) {
        _config->data.brightness = json["brightness"];
        _leds->setBrightness(_config->data.brightness);
    }
    if (json["fpsMax"].is<int>())
        _config->data.fpsMax = json["fpsMax"];
    if (json["timeoutMs"].is<int>())
        _config->data.timeoutMs = json["timeoutMs"];
    if (json["stripCount"].is<int>())
        _config->data.stripCount = constrain(
            (int)json["stripCount"], 1, MAX_STRIPS);

    // Config des bandes
    if (json["strips"].is<JsonArray>()) {
        for (JsonVariant sv : json["strips"].as<JsonArray>()) {
            int idx = sv["index"] | -1;
            if (idx < 0 || idx >= MAX_STRIPS) continue;

            StripConfig& s = _config->data.strips[idx];

            if (sv["enabled"].is<bool>())
                s.enabled = sv["enabled"];
            if (sv["pin"].is<int>())
                s.pin = sv["pin"];
            if (sv["name"].is<const char*>())
                strlcpy(s.name, sv["name"], sizeof(s.name));
            if (sv["ledCount"].is<int>())
                s.ledCount = sv["ledCount"];
            if (sv["dmxUniverse"].is<int>())
                s.dmxUniverse = sv["dmxUniverse"];
            if (sv["dmxStartChannel"].is<int>())
                s.dmxStartChannel = sv["dmxStartChannel"];
            if (sv["dmxMode"].is<int>())
                s.dmxMode = sv["dmxMode"];
            if (sv["dmxGroupSize"].is<int>())
                s.dmxGroupSize = sv["dmxGroupSize"];
            if (sv["universe2"].is<int>())
                s.universe2 = sv["universe2"];
            if (sv["universe2StartCh"].is<int>())
                s.universe2StartCh = sv["universe2StartCh"];
            if (sv["universe2LedStart"].is<int>())
                s.universe2LedStart = sv["universe2LedStart"];
            if (sv["universeMode"].is<int>())
                s.universeMode = sv["universeMode"];
        }
    }

    _config->save();
    req->send(200, "application/json", "{\"ok\":true}");
}

// ─── POST /api/wifi ───────────────────────────────────────────────────────────
void WebServer::_handlePostWifi(AsyncWebServerRequest* req,
                                 JsonVariant& json) {
    if (!json["ssid"].is<const char*>()) {
        req->send(400, "application/json", "{\"error\":\"ssid requis\"}");
        return;
    }
    strlcpy(_config->data.wifiSSID,
            json["ssid"], sizeof(_config->data.wifiSSID));
    if (json["password"].is<const char*>())
        strlcpy(_config->data.wifiPassword,
                json["password"], sizeof(_config->data.wifiPassword));
    _config->save();
    req->send(200, "application/json", "{\"ok\":true,\"reboot\":true}");
    delay(1000);
    ESP.restart();
}

// ─── POST /api/test ───────────────────────────────────────────────────────────
void WebServer::_handlePostTest(AsyncWebServerRequest* req, JsonVariant& json) {
    int    stripIdx = json["strip"] | 0;
    String mode     = json["mode"]  | "color";

    if (stripIdx < 0 || stripIdx >= MAX_STRIPS) {
        req->send(400, "application/json", "{\"error\":\"strip invalide\"}");
        return;
    }

    StripController& strip = _leds->getStrip(stripIdx);

    if (mode == "color") {
        uint8_t r = json["r"] | 255;
        uint8_t g = json["g"] | 0;
        uint8_t b = json["b"] | 0;
        // Arrête l'effet autonome et applique la couleur
        _effects->setEffect(stripIdx, EFFECT_SOLID);
        _effects->setColor(stripIdx, r, g, b);
        strip.setAll(r, g, b);
        _leds->show();
    } else if (mode == "rainbow") {
        _effects->setEffect(stripIdx, EFFECT_RAINBOW);
    } else if (mode == "off") {
        _effects->setEffect(stripIdx, EFFECT_NONE);
        strip.clear();
        _leds->show();
    }

    req->send(200, "application/json", "{\"ok\":true}");
}

// ─── POST /api/effect ─────────────────────────────────────────────────────────
void WebServer::_handlePostEffect(AsyncWebServerRequest* req,
                                   JsonVariant& json) {
    int stripIdx = json["strip"] | 0;
    int type     = json["type"]  | 1;

    if (stripIdx >= 0 && stripIdx < MAX_STRIPS) {
        _effects->setEffect(stripIdx, (EffectType)type);
        if (json["r"].is<int>())
            _effects->setColor(stripIdx, json["r"], json["g"], json["b"]);
        if (json["speed"].is<int>())
            _effects->setSpeed(stripIdx, json["speed"]);
    }

    req->send(200, "application/json", "{\"ok\":true}");
}

// ─── POST /api/reboot ─────────────────────────────────────────────────────────
void WebServer::_handleReboot(AsyncWebServerRequest* req) {
    req->send(200, "application/json", "{\"ok\":true}");
    delay(500);
    ESP.restart();
}