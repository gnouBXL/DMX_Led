#pragma once
#include <Arduino.h>
#include <WiFiUdp.h>
#include "../config/Config.h"

class Discovery {
public:
    void begin(DeviceConfig& config);
    void loop();  // à appeler régulièrement pour envoyer les annonces

private:
    DeviceConfig* _config    = nullptr;
    WiFiUDP       _udp;
    uint32_t      _lastAnnounce = 0;

    static const uint16_t DISCOVERY_PORT    = 4210;
    static const uint32_t ANNOUNCE_INTERVAL = 5000; // toutes les 5s

    void _sendAnnounce();
};