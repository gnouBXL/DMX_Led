#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "../config/Config.h"

// États Wi-Fi
enum WiFiState {
    WIFI_STATE_DISCONNECTED,
    WIFI_STATE_CONNECTING,
    WIFI_STATE_CONNECTED,
    WIFI_STATE_AP_MODE
};

class WiFiManager {
public:
    void begin(DeviceConfig& config);
    void loop();

    bool        isConnected();
    WiFiState   getState();
    String      getIP();
    int         getRSSI();

private:
    DeviceConfig* _config;
    WiFiState     _state = WIFI_STATE_DISCONNECTED;
    uint32_t      _lastAttempt = 0;
    uint8_t       _retryCount  = 0;

    void _connectToWifi();
    void _startAPMode();
    void _startMDNS();
};