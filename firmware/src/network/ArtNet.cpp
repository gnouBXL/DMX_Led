#include "ArtNet.h"

static const uint8_t ARTNET_HEADER[] = {
    'A','r','t','-','N','e','t',0x00
};
#define ARTNET_OPCODE_DMX_HI  0x50
#define ARTNET_OPCODE_DMX_LO  0x00
#define ARTNET_HEADER_SIZE    18

void ArtNet::begin(DeviceConfig& config, ArtNetCallback callback) {
    _config   = &config;
    _callback = callback;

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        memset(_strips[i].bufU1, 0, ARTNET_MAX_LENGTH);
        memset(_strips[i].bufU2, 0, ARTNET_MAX_LENGTH);
    }

    if (_udp.listen(ARTNET_PORT)) {
        Serial.printf("[ArtNet] Écoute port %d\n", ARTNET_PORT);

        for (uint8_t i = 0; i < MAX_STRIPS; i++) {
            if (!config.strips[i].enabled) continue;
            Serial.printf("[ArtNet] Bande %d : U%d",
                          i+1, config.strips[i].dmxUniverse);
            if (config.strips[i].universe2 > 0)
                Serial.printf(" + U%d", config.strips[i].universe2);
            Serial.println();
        }

        _udp.onPacket([this](AsyncUDPPacket packet) {
            _handlePacket(packet);
        });
    } else {
        Serial.println("[ArtNet] Erreur ouverture port !");
    }
}

void ArtNet::stop() {
    _udp.close();
    _receiving = false;
}

void ArtNet::loop() {
    // Timeout synchro U1+U2 pour chaque bande (dans la tâche WiFi — ok)
    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        if (!_config->strips[i].enabled) continue;
        if (_config->strips[i].universe2 == 0) continue;

        StripUniverse& su = _strips[i];
        if (su.u1Ready && !su.u2Ready) {
            if (millis() - su.u1Time > SYNC_TIMEOUT_MS) {
                su.u2Ready = true;
                _tryMergeAndApply(i);
            }
        }
        if (su.u2Ready && !su.u1Ready) {
            if (millis() - su.u2Time > SYNC_TIMEOUT_MS) {
                su.u1Ready = true;
                _tryMergeAndApply(i);
            }
        }
    }

    // Dispatch des frames en attente depuis le loop principal (thread-safe)
    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        bool hasPending = false;
        uint8_t  buf[ARTNET_BUFFER_SIZE];
        uint16_t len = 0;

        taskENTER_CRITICAL(&_mux);
        if (_pending[i].dirty) {
            memcpy(buf, _pending[i].buf, _pending[i].len);
            len = _pending[i].len;
            _pending[i].dirty = false;
            hasPending = true;
        }
        taskEXIT_CRITICAL(&_mux);

        if (hasPending && _callback) {
            _callback(i, buf, len);
        }
    }
}

void ArtNet::_handlePacket(AsyncUDPPacket& packet) {
    uint8_t* data   = packet.data();
    size_t   length = packet.length();

    if (!_isValidArtNet(data, length)) return;

    uint16_t universe = _getUniverse(data);
    uint16_t dmxLen   = (data[16] << 8) | data[17];
    dmxLen = min((uint16_t)ARTNET_MAX_LENGTH, dmxLen);

    _lastPacket  = millis();
    _packetCount++;
    _receiving   = true;

    // Cherche quelle(s) bande(s) utilisent cet univers
    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        if (!_config->strips[i].enabled) continue;

        StripConfig&   sc = _config->strips[i];
        StripUniverse& su = _strips[i];

        if (universe == sc.dmxUniverse) {
            memcpy(su.bufU1, data + ARTNET_HEADER_SIZE, dmxLen);
            su.lenU1  = dmxLen;
            su.u1Ready = true;
            su.u1Time  = millis();

            if (sc.universe2 == 0) {
                uint8_t  merged[ARTNET_BUFFER_SIZE];
                uint16_t mergedLen = 0;
                _buildMergedBuffer(i, merged, mergedLen);
                taskENTER_CRITICAL(&_mux);
                memcpy(_pending[i].buf, merged, mergedLen);
                _pending[i].len   = mergedLen;
                _pending[i].dirty = true;
                taskEXIT_CRITICAL(&_mux);
            } else {
                _tryMergeAndApply(i);
            }

        } else if (sc.universe2 > 0 && universe == sc.universe2) {
            memcpy(su.bufU2, data + ARTNET_HEADER_SIZE, dmxLen);
            su.lenU2  = dmxLen;
            su.u2Ready = true;
            su.u2Time  = millis();
            _tryMergeAndApply(i);
        }
    }
}

void ArtNet::_tryMergeAndApply(uint8_t stripIndex) {
    StripUniverse& su = _strips[stripIndex];
    if (!su.u1Ready || !su.u2Ready) return;

    uint8_t  merged[ARTNET_BUFFER_SIZE];
    uint16_t mergedLen = 0;
    _buildMergedBuffer(stripIndex, merged, mergedLen);

    if (mergedLen > 0) {
        taskENTER_CRITICAL(&_mux);
        memcpy(_pending[stripIndex].buf, merged, mergedLen);
        _pending[stripIndex].len   = mergedLen;
        _pending[stripIndex].dirty = true;
        taskEXIT_CRITICAL(&_mux);
    }

    su.u1Ready = false;
    su.u2Ready = false;
}

void ArtNet::_buildMergedBuffer(uint8_t idx,
                                uint8_t* merged,
                                uint16_t& mergedLen) {
    StripConfig&   sc = _config->strips[idx];
    StripUniverse& su = _strips[idx];

    uint16_t offsetU1 = sc.dmxStartChannel - 1;
    uint16_t offsetU2 = sc.universe2StartCh - 1;
    uint16_t totalCh  = sc.totalChannels();

    if (sc.universe2 == 0) {
        // ── Un seul univers ────────────────────────────────────────────────────
        uint16_t avail = (su.lenU1 > offsetU1) ? su.lenU1 - offsetU1 : 0;
        uint16_t copy  = min(totalCh, avail);
        memcpy(merged, su.bufU1 + offsetU1, copy);
        mergedLen = copy;
        return;
    }

    switch (sc.universeMode) {

        case UNIVERSE_MODE_MANUAL: {
            uint16_t ledStartU2 = sc.universe2LedStart;
            uint16_t chU1       = ledStartU2 * 3;
            uint16_t chU2       = (sc.ledCount - ledStartU2) * 3;
            uint16_t availU1    = (su.lenU1 > offsetU1) ? su.lenU1 - offsetU1 : 0;
            uint16_t availU2    = (su.lenU2 > offsetU2) ? su.lenU2 - offsetU2 : 0;
            uint16_t copyU1     = min(chU1, availU1);
            uint16_t copyU2     = min(chU2, availU2);
            memcpy(merged,        su.bufU1 + offsetU1, copyU1);
            memcpy(merged + copyU1, su.bufU2 + offsetU2, copyU2);
            mergedLen = copyU1 + copyU2;
            break;
        }

        case UNIVERSE_MODE_CONT: {
            uint16_t chFromU1 = (su.lenU1 > offsetU1) ? su.lenU1 - offsetU1 : 0;
            uint16_t chFromU2 = (su.lenU2 > offsetU2) ? su.lenU2 - offsetU2 : 0;
            uint16_t copyU1   = min(chFromU1, totalCh);
            memcpy(merged, su.bufU1 + offsetU1, copyU1);
            uint16_t remaining = totalCh - copyU1;
            uint16_t copyU2    = min(chFromU2, remaining);
            memcpy(merged + copyU1, su.bufU2 + offsetU2, copyU2);
            mergedLen = copyU1 + copyU2;
            break;
        }

        case UNIVERSE_MODE_ALIGNED: {
            uint16_t chFromU1 = (su.lenU1 > offsetU1) ? su.lenU1 - offsetU1 : 0;
            uint16_t ledsInU1 = chFromU1 / 3;
            uint16_t copyU1   = ledsInU1 * 3;
            uint16_t ledsInU2 = sc.ledCount - ledsInU1;
            uint16_t chFromU2 = (su.lenU2 > offsetU2) ? su.lenU2 - offsetU2 : 0;
            uint16_t copyU2   = min((uint16_t)(ledsInU2 * 3), chFromU2);
            memcpy(merged,        su.bufU1 + offsetU1, copyU1);
            memcpy(merged + copyU1, su.bufU2 + offsetU2, copyU2);
            mergedLen = copyU1 + copyU2;
            break;
        }
    }
}

bool ArtNet::_isValidArtNet(uint8_t* data, size_t length) {
    if (length < ARTNET_HEADER_SIZE) return false;
    if (memcmp(data, ARTNET_HEADER, 8) != 0) return false;
    if (data[8] != ARTNET_OPCODE_DMX_LO) return false;
    if (data[9] != ARTNET_OPCODE_DMX_HI) return false;
    return true;
}

uint16_t ArtNet::_getUniverse(uint8_t* data) {
    return data[14] | (data[15] << 8);
}

bool ArtNet::isReceiving() {
    if (_receiving && (millis() - _lastPacket > 2000))
        _receiving = false;
    return _receiving;
}

uint32_t ArtNet::getLastPacketTime() { return _lastPacket; }
uint32_t ArtNet::getPacketCount()    { return _packetCount; }