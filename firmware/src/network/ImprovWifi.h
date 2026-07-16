#pragma once
#include <Arduino.h>
#include "../config/Config.h"

// Implémentation du protocole Improv WiFi (https://www.improv-wifi.com/serial/)
// Permet la config WiFi via USB depuis ESP Web Tools
class ImprovWifi {
public:
    void begin(Config& config);
    void loop();

private:
    Config*  _config    = nullptr;
    uint32_t _lastState = 0;
    uint8_t  _rxBuf[512];
    size_t   _rxLen     = 0;

    void _sendPacket(uint8_t type, const uint8_t* data, size_t len);
    void _sendCurrentState();
    void _handleRpc(const uint8_t* data, size_t len);
    void _handleSetWifi(const uint8_t* data, size_t len);
    void _handleDeviceInfo();

    static uint8_t _checksum(const uint8_t* buf, size_t len);
};
