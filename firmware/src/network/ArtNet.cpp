#include "ArtNet.h"

// En-tête Art-Net : "Art-Net" + octet nul
static const uint8_t ARTNET_HEADER[] = {
    'A','r','t','-','N','e','t',0x00
};

// OpCode ArtDMX = 0x5000 (little-endian → 0x00, 0x50)
#define ARTNET_OPCODE_DMX_HI  0x50
#define ARTNET_OPCODE_DMX_LO  0x00
#define ARTNET_HEADER_SIZE    18  // taille minimale paquet ArtDMX

void ArtNet::begin(DeviceConfig& config, ArtNetCallback callback) {
    _config   = &config;
    _callback = callback;

    if (_udp.listen(ARTNET_PORT)) {
        Serial.printf("[ArtNet] Écoute sur port %d\n", ARTNET_PORT);
        Serial.printf("[ArtNet] Filtre univers : %d\n", _config->dmxUniverse);

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

void ArtNet::_handlePacket(AsyncUDPPacket& packet) {
    uint8_t* data   = packet.data();
    size_t   length = packet.length();

    // Vérifie que c'est un paquet Art-Net valide
    if (!_isValidArtNet(data, length)) return;

    // Vérifie que c'est notre univers
    uint16_t universe = _getUniverse(data);
    if (universe != _config->dmxUniverse) return;

    // Récupère les données DMX (commence à l'octet 18)
    uint16_t dmxLength = (data[16] << 8) | data[17];
    dmxLength = min((uint16_t)ARTNET_MAX_LENGTH, dmxLength);

    _lastPacket  = millis();
    _packetCount++;
    _receiving   = true;

    // Appelle le callback avec les données DMX brutes
    if (_callback) {
        _callback(data + ARTNET_HEADER_SIZE, dmxLength);
    }
}

bool ArtNet::_isValidArtNet(uint8_t* data, size_t length) {
    // Taille minimale
    if (length < ARTNET_HEADER_SIZE) return false;

    // Vérifie l'en-tête "Art-Net\0"
    if (memcmp(data, ARTNET_HEADER, 8) != 0) return false;

    // Vérifie OpCode ArtDMX (octets 8-9)
    if (data[8] != ARTNET_OPCODE_DMX_LO) return false;
    if (data[9] != ARTNET_OPCODE_DMX_HI) return false;

    return true;
}

uint16_t ArtNet::_getUniverse(uint8_t* data) {
    // Univers Art-Net : octet 14 (SubUni) + octet 15 (Net)
    return data[14] | (data[15] << 8);
}

bool ArtNet::isReceiving() {
    // Considère "en réception" si paquet reçu dans les 2 dernières secondes
    if (_receiving && (millis() - _lastPacket > 2000)) {
        _receiving = false;
    }
    return _receiving;
}

uint32_t ArtNet::getLastPacketTime() {
    return _lastPacket;
}

uint32_t ArtNet::getPacketCount() {
    return _packetCount;
}