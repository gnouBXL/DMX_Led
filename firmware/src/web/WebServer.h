#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <AsyncJson.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Update.h>
#include "../config/Config.h"
#include "../leds/LedController.h"
#include "../leds/Effects.h"
#include "../network/WiFiManager.h"

class WebServer {
public:
    void begin(Config& config, LedController& leds,
               Effects& effects, WiFiManager& wifi);

private:
    AsyncWebServer _server{80};
    Config*        _config  = nullptr;
    LedController* _leds    = nullptr;
    Effects*       _effects = nullptr;
    WiFiManager*   _wifi    = nullptr;


    void _setupRoutes();

    void _handleGetStatus(AsyncWebServerRequest* req);
    void _handleGetConfig(AsyncWebServerRequest* req);
    void _handlePostConfig(AsyncWebServerRequest* req, JsonVariant& json);
    void _handlePostWifi(AsyncWebServerRequest* req, JsonVariant& json);
    void _handlePostTest(AsyncWebServerRequest* req, JsonVariant& json);
    void _handlePostEffect(AsyncWebServerRequest* req, JsonVariant& json);
    void _handleReboot(AsyncWebServerRequest* req);
    void _handleGetWifiScan(AsyncWebServerRequest* req);
    
    bool _testModePersistent[MAX_STRIPS] = { false };
    bool     _testMode[MAX_STRIPS]    = { false };
    uint32_t _testModeTime[MAX_STRIPS]= { 0 };

public:
    bool isTestMode(uint8_t stripIdx) {
        if (stripIdx >= MAX_STRIPS) return false;
        if (_testMode[stripIdx] && !_testModePersistent[stripIdx] && millis() - _testModeTime[stripIdx] > 3000) {
            _testMode[stripIdx] = false;
        }
        return _testMode[stripIdx];
    }
};