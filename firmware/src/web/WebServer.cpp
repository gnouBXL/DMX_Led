#include "WebServer.h"
#include <ArduinoJson.h>

void WebServer::begin(Config& config, LedController& leds,
                      Effects& effects, WiFiManager& wifi) {
    _config  = &config;
    _leds    = &leds;
    _effects = &effects;
    _wifi    = &wifi;

    _setupRoutes();
    _server.begin();
    Serial.println("[WebServer] Démarré sur port 80");
}

void WebServer::_setupRoutes() {

    // ── CORS : autorise les requêtes du dashboard ──────────────────
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods",
                                         "GET, POST, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers",
                                         "Content-Type");

    // ── OPTIONS preflight ──────────────────────────────────────────
    _server.onNotFound([](AsyncWebServerRequest* req) {
        if (req->method() == HTTP_OPTIONS) {
            req->send(200);
        } else {
            req->send(404, "application/json", "{\"error\":\"not found\"}");
        }
    });

    // ── GET /api/status ───────────────────────────────────────────
    _server.on("/api/status", HTTP_GET,
        [this](AsyncWebServerRequest* req) {
            _handleGetStatus(req);
        });

    // ── GET /api/config ───────────────────────────────────────────
    _server.on("/api/config", HTTP_GET,
        [this](AsyncWebServerRequest* req) {
            _handleGetConfig(req);
        });

    // ── POST /api/config ──────────────────────────────────────────
    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/config",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            JsonDocument doc = json.as<JsonDocument>();
            _handlePostConfig(req, doc);
        }));

    // ── POST /api/wifi ────────────────────────────────────────────
    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/wifi",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            JsonDocument doc = json.as<JsonDocument>();
            _handlePostWifi(req, doc);
        }));

    // ── POST /api/test ────────────────────────────────────────────
    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/test",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            JsonDocument doc = json.as<JsonDocument>();
            _handlePostTest(req, doc);
        }));

    // ── POST /api/effect ──────────────────────────────────────────
    _server.addHandler(new AsyncCallbackJsonWebHandler(
        "/api/effect",
        [this](AsyncWebServerRequest* req, JsonVariant& json) {
            JsonDocument doc = json.as<JsonDocument>();
            _handlePostEffect(req, doc);
        }));

    // ── POST /api/reboot ──────────────────────────────────────────
    _server.on("/api/reboot", HTTP_POST,
        [this](AsyncWebServerRequest* req) {
            _handleReboot(req);
        });

    // ── Fichiers statiques (UI locale) ────────────────────────────
    _server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
}

// ─── GET /api/status ──────────────────────────────────────────────────────────
void WebServer::_handleGetStatus(AsyncWebServerRequest* req) {
    JsonDocument doc;

    doc["name"]       = _config->data.deviceName;
    doc["ip"]         = _wifi->getIP();
    doc["rssi"]       = _wifi->getRSSI();
    doc["wifiState"]  = (int)_wifi->getState();
    doc["freeHeap"]   = ESP.getFreeHeap();
    doc["uptime"]     = millis() / 1000;
    doc["firmware"]   = "1.0.0";

    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
}

// ─── GET /api/config ──────────────────────────────────────────────────────────
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

    // Calcul automatique du dernier canal utilisé
    uint16_t channels = 0;
    switch (_config->data.dmxMode) {
        case 0: channels = _config->data.ledCount * 3; break;
        case 1: channels = (_config->data.ledCount /
                            _config->data.dmxGroupSize) * 3; break;
        case 2: channels = 3; break;
    }
    doc["dmxChannelsUsed"] = channels;
    doc["dmxLastChannel"]  = _config->data.dmxStartChannel + channels - 1;

    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
}

// ─── POST /api/config ─────────────────────────────────────────────────────────
void WebServer::_handlePostConfig(AsyncWebServerRequest* req,
                                   JsonDocument& body) {
    if (body["deviceName"].is<const char*>())
        strlcpy(_config->data.deviceName,
                body["deviceName"], sizeof(_config->data.deviceName));

    if (body["ledCount"].is<int>())
        _config->data.ledCount = body["ledCount"];

    if (body["dmxUniverse"].is<int>())
        _config->data.dmxUniverse = body["dmxUniverse"];

    if (body["dmxStartChannel"].is<int>())
        _config->data.dmxStartChannel = body["dmxStartChannel"];

    if (body["dmxMode"].is<int>())
        _config->data.dmxMode = body["dmxMode"];

    if (body["dmxGroupSize"].is<int>())
        _config->data.dmxGroupSize = body["dmxGroupSize"];

    if (body["brightness"].is<int>()) {
        _config->data.brightness = body["brightness"];
        _leds->setBrightness(_config->data.brightness);
    }

    if (body["fpsMax"].is<int>())
        _config->data.fpsMax = body["fpsMax"];

    if (body["timeoutMs"].is<int>())
        _config->data.timeoutMs = body["timeoutMs"];

    _config->save();

    req->send(200, "application/json", "{\"ok\":true}");
}

// ─── POST /api/wifi ───────────────────────────────────────────────────────────
void WebServer::_handlePostWifi(AsyncWebServerRequest* req,
                                 JsonDocument& body) {
    if (!body["ssid"].is<const char*>()) {
        req->send(400, "application/json", "{\"error\":\"ssid requis\"}");
        return;
    }

    strlcpy(_config->data.wifiSSID,
            body["ssid"], sizeof(_config->data.wifiSSID));

    if (body["password"].is<const char*>())
        strlcpy(_config->data.wifiPassword,
                body["password"], sizeof(_config->data.wifiPassword));

    _config->save();

    req->send(200, "application/json", "{\"ok\":true,\"reboot\":true}");

    // Reboot après 1s pour appliquer le nouveau Wi-Fi
    delay(1000);
    ESP.restart();
}

// ─── POST /api/test ───────────────────────────────────────────────────────────
void WebServer::_handlePostTest(AsyncWebServerRequest* req,
                                 JsonDocument& body) {
    String mode = body["mode"] | "color";

    if (mode == "color") {
        uint8_t r = body["r"] | 255;
        uint8_t g = body["g"] | 0;
        uint8_t b = body["b"] | 0;
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

// ─── POST /api/effect ─────────────────────────────────────────────────────────
void WebServer::_handlePostEffect(AsyncWebServerRequest* req,
                                   JsonDocument& body) {
    int type = body["type"] | 1;
    _effects->setEffect((EffectType)type);

    if (body["r"].is<int>()) {
        _effects->setColor(body["r"], body["g"], body["b"]);
    }
    if (body["speed"].is<int>()) {
        _effects->setSpeed(body["speed"]);
    }

    req->send(200, "application/json", "{\"ok\":true}");
}

// ─── POST /api/reboot ─────────────────────────────────────────────────────────
void WebServer::_handleReboot(AsyncWebServerRequest* req) {
    req->send(200, "application/json", "{\"ok\":true}");
    delay(500);
    ESP.restart();
}