#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
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

    // Routes API
    void _handleGetStatus(AsyncWebServerRequest* req);
    void _handleGetConfig(AsyncWebServerRequest* req);
    void _handlePostConfig(AsyncWebServerRequest* req,
                           JsonDocument& body);
    void _handlePostWifi(AsyncWebServerRequest* req,
                         JsonDocument& body);
    void _handlePostTest(AsyncWebServerRequest* req,
                         JsonDocument& body);
    void _handlePostEffect(AsyncWebServerRequest* req,
                           JsonDocument& body);
    void _handleReboot(AsyncWebServerRequest* req);
};