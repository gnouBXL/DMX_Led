#pragma once
#include <Arduino.h>
#include <AsyncUDP.h>
#include "../config/Config.h"

#define ARTNET_PORT         6454
#define ARTNET_MAX_LENGTH   512

// Buffer fusionné max : 2 univers × 512 canaux
#define ARTNET_BUFFER_SIZE  1024

// Callback appelé quand les données sont prêtes à être appliquées aux LEDs
typedef std::function<void(uint8_t* data, uint16_t length)> ArtNetCallback;

class ArtNet {
public:
    void begin(DeviceConfig& config, ArtNetCallback callback);
    void stop();
    void loop();  // vérifie le timeout de synchronisation inter-univers

    bool     isReceiving();
    uint32_t getLastPacketTime();
    uint32_t getPacketCount();

private:
    DeviceConfig*  _config;
    AsyncUDP       _udp;
    ArtNetCallback _callback;

    // ── Buffers par univers ────────────────────────────────────────────────────
    uint8_t  _bufU1[ARTNET_MAX_LENGTH];   // données brutes univers 1
    uint8_t  _bufU2[ARTNET_MAX_LENGTH];   // données brutes univers 2
    uint16_t _lenU1 = 0;
    uint16_t _lenU2 = 0;
    bool     _u1Ready = false;
    bool     _u2Ready = false;
    uint32_t _u1Time  = 0;
    uint32_t _u2Time  = 0;

    // ── État général ──────────────────────────────────────────────────────────
    bool     _receiving   = false;
    uint32_t _lastPacket  = 0;
    uint32_t _packetCount = 0;

    // ── Méthodes privées ──────────────────────────────────────────────────────
    void     _handlePacket(AsyncUDPPacket& packet);
    bool     _isValidArtNet(uint8_t* data, size_t length);
    uint16_t _getUniverse(uint8_t* data);
    void     _tryMergeAndApply();
    void     _buildMergedBuffer(uint8_t* merged, uint16_t& mergedLen);
};