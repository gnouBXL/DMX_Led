#pragma once
#include <Arduino.h>
#include <AsyncUDP.h>
#include "../config/Config.h"

#define ARTNET_PORT         6454
#define ARTNET_MAX_LENGTH   512

// Callback appelé quand un paquet valide arrive pour notre univers
typedef std::function<void(uint8_t* data, uint16_t length)> ArtNetCallback;

class ArtNet {
public:
    void begin(DeviceConfig& config, ArtNetCallback callback);
    void stop();

    bool     isReceiving();
    uint32_t getLastPacketTime();
    uint32_t getPacketCount();

private:
    DeviceConfig*  _config;
    AsyncUDP       _udp;
    ArtNetCallback _callback;

    bool     _receiving   = false;
    uint32_t _lastPacket  = 0;
    uint32_t _packetCount = 0;

    void _handlePacket(AsyncUDPPacket& packet);
    bool _isValidArtNet(uint8_t* data, size_t length);
    uint16_t _getUniverse(uint8_t* data);
};