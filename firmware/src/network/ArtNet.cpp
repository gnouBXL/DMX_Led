#include "ArtNet.h"

static const uint8_t ARTNET_HEADER[] = {
    'A','r','t','-','N','e','t',0x00
};

#define ARTNET_OPCODE_DMX_HI  0x50
#define ARTNET_OPCODE_DMX_LO  0x00
#define ARTNET_HEADER_SIZE    18

// Délai max entre U1 et U2 pour les considérer synchronisés (ms)
#define SYNC_TIMEOUT_MS       50

void ArtNet::begin(DeviceConfig& config, ArtNetCallback callback) {
    _config   = &config;
    _callback = callback;

    memset(_bufU1, 0, sizeof(_bufU1));
    memset(_bufU2, 0, sizeof(_bufU2));

    if (_udp.listen(ARTNET_PORT)) {
        Serial.printf("[ArtNet] Écoute port %d\n", ARTNET_PORT);
        Serial.printf("[ArtNet] Univers 1 : %d\n", _config->dmxUniverse);
        if (_config->universe2 > 0) {
            Serial.printf("[ArtNet] Univers 2 : %d\n", _config->universe2);
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

// ─── Appelé dans loop() pour gérer le timeout de synchro ─────────────────────
void ArtNet::loop() {
    if (_config->universe2 == 0) return;

    // Si U1 reçu mais U2 pas encore dans le délai → applique quand même U1 seul
    if (_u1Ready && !_u2Ready) {
        if (millis() - _u1Time > SYNC_TIMEOUT_MS) {
            Serial.println("[ArtNet] Timeout U2 → applique U1 seul");
            _u2Ready = true;  // force le merge avec buffer U2 vide
            _tryMergeAndApply();
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

    if (universe == _config->dmxUniverse) {
        // ── Univers 1 ──────────────────────────────────────────────────────────
        memcpy(_bufU1, data + ARTNET_HEADER_SIZE, dmxLen);
        _lenU1   = dmxLen;
        _u1Ready = true;
        _u1Time  = millis();

        if (_config->universe2 == 0) {
            // Pas de 2ème univers → applique directement
            if (_callback) {
                _callback(_bufU1, _lenU1);
            }
        } else {
            _tryMergeAndApply();
        }

    } else if (_config->universe2 > 0 &&
               universe == _config->universe2) {
        // ── Univers 2 ──────────────────────────────────────────────────────────
        memcpy(_bufU2, data + ARTNET_HEADER_SIZE, dmxLen);
        _lenU2   = dmxLen;
        _u2Ready = true;
        _u2Time  = millis();
        _tryMergeAndApply();
    }
}

// ─── Tente de fusionner U1+U2 et appelle le callback ─────────────────────────
void ArtNet::_tryMergeAndApply() {
    if (!_u1Ready || !_u2Ready) return;

    uint8_t  merged[ARTNET_BUFFER_SIZE];
    uint16_t mergedLen = 0;

    _buildMergedBuffer(merged, mergedLen);

    if (_callback && mergedLen > 0) {
        _callback(merged, mergedLen);
    }

    // Reset pour la prochaine frame
    _u1Ready = false;
    _u2Ready = false;
}

// ─── Construction du buffer fusionné selon le mode ───────────────────────────
void ArtNet::_buildMergedBuffer(uint8_t* merged, uint16_t& mergedLen) {
    // Offset dans U1 selon le canal de départ
    uint16_t offsetU1 = _config->dmxStartChannel - 1;
    uint16_t offsetU2 = _config->universe2StartCh - 1;

    if (_config->universeMode == 0) {
        // ── Mode Manuel (TouchDesigner) ────────────────────────────────────────
        // U1 fournit les LEDs 0 → universe2LedStart-1
        // U2 fournit les LEDs universe2LedStart → ledCount-1
        uint16_t ledStartU2 = _config->universe2LedStart;
        uint16_t chU1       = ledStartU2 * 3;
        uint16_t chU2       = (_config->ledCount - ledStartU2) * 3;

        // Copie données U1
        uint16_t availU1 = (_lenU1 > offsetU1) ? _lenU1 - offsetU1 : 0;
        uint16_t copyU1  = min(chU1, availU1);
        memcpy(merged, _bufU1 + offsetU1, copyU1);

        // Copie données U2
        uint16_t availU2 = (_lenU2 > offsetU2) ? _lenU2 - offsetU2 : 0;
        uint16_t copyU2  = min(chU2, availU2);
        memcpy(merged + chU1, _bufU2 + offsetU2, copyU2);

        mergedLen = chU1 + copyU2;

    } else if (_config->universeMode == 1) {
        // ── Mode Continuation (QLC+) ───────────────────────────────────────────
        // U1 : canaux offsetU1 → 511 (max 512-offsetU1 canaux)
        // U2 : canaux offsetU2 → fin
        // La LED peut être coupée entre U1 et U2 — on recolle les octets

        uint16_t chFromU1 = (_lenU1 > offsetU1) ? _lenU1 - offsetU1 : 0;
        uint16_t chFromU2 = (_lenU2 > offsetU2) ? _lenU2 - offsetU2 : 0;
        uint16_t totalCh  = _config->ledCount * 3;

        uint16_t copyU1 = min(chFromU1, totalCh);
        memcpy(merged, _bufU1 + offsetU1, copyU1);

        uint16_t remaining = totalCh - copyU1;
        uint16_t copyU2    = min(chFromU2, remaining);
        memcpy(merged + copyU1, _bufU2 + offsetU2, copyU2);

        mergedLen = copyU1 + copyU2;

    } else {
        // ── Mode Pixel Aligné (Resolume) ───────────────────────────────────────
        // U1 : pixels complets seulement (division entière par 3)
        // Les canaux restants en fin d'U1 sont ignorés (skip)
        // U2 : repart proprement depuis offsetU2

        uint16_t chFromU1  = (_lenU1 > offsetU1) ? _lenU1 - offsetU1 : 0;
        uint16_t ledsInU1  = chFromU1 / 3;          // pixel aligné
        uint16_t copyU1    = ledsInU1 * 3;

        uint16_t ledsInU2  = _config->ledCount - ledsInU1;
        uint16_t chFromU2  = (_lenU2 > offsetU2) ? _lenU2 - offsetU2 : 0;
        uint16_t copyU2    = min((uint16_t)(ledsInU2 * 3), chFromU2);

        memcpy(merged, _bufU1 + offsetU1, copyU1);
        memcpy(merged + copyU1, _bufU2 + offsetU2, copyU2);

        mergedLen = copyU1 + copyU2;
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
    if (_receiving && (millis() - _lastPacket > 2000)) {
        _receiving = false;
    }
    return _receiving;
}

uint32_t ArtNet::getLastPacketTime() { return _lastPacket; }
uint32_t ArtNet::getPacketCount()    { return _packetCount; }