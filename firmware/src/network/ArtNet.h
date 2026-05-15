#pragma once
#include <Arduino.h>
#include <AsyncUDP.h>
#include "../config/Config.h"

#define ARTNET_PORT        6454
#define ARTNET_MAX_LENGTH  512
#define ARTNET_BUFFER_SIZE 1024
#define SYNC_TIMEOUT_MS    50

// Callback par bande : index de la bande + buffer fusionné
typedef std::function<void(uint8_t stripIndex,
                           uint8_t* data,
                           uint16_t length)> ArtNetCallback;

// État de réception pour une bande (1 ou 2 univers)
struct StripUniverse {
    uint8_t  bufU1[ARTNET_MAX_LENGTH];
    uint8_t  bufU2[ARTNET_MAX_LENGTH];
    uint16_t lenU1    = 0;
    uint16_t lenU2    = 0;
    bool     u1Ready  = false;
    bool     u2Ready  = false;
    uint32_t u1Time   = 0;
    uint32_t u2Time   = 0;
};

class ArtNet {
public:
    void begin(DeviceConfig& config, ArtNetCallback callback);
    void stop();
    void loop();

    bool     isReceiving();
    uint32_t getLastPacketTime();
    uint32_t getPacketCount();

private:
    DeviceConfig*  _config   = nullptr;
    AsyncUDP       _udp;
    ArtNetCallback _callback;

    // Un état par bande
    StripUniverse  _strips[MAX_STRIPS];

    bool     _receiving   = false;
    uint32_t _lastPacket  = 0;
    uint32_t _packetCount = 0;

    void     _handlePacket(AsyncUDPPacket& packet);
    bool     _isValidArtNet(uint8_t* data, size_t length);
    uint16_t _getUniverse(uint8_t* data);
    void     _tryMergeAndApply(uint8_t stripIndex);
    void     _buildMergedBuffer(uint8_t stripIndex,
                                uint8_t* merged,
                                uint16_t& mergedLen);
};