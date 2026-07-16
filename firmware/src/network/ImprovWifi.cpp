#include "ImprovWifi.h"
#include <WiFi.h>

// Types de paquets
#define IMPROV_TYPE_STATE      0x01
#define IMPROV_TYPE_ERROR      0x02
#define IMPROV_TYPE_RPC        0x03
#define IMPROV_TYPE_RPC_RESULT 0x04

// États
#define STATE_AUTHORIZED   0x02  // pas de config, en attente
#define STATE_PROVISIONING 0x03  // connexion en cours
#define STATE_PROVISIONED  0x04  // connecté

// Erreurs
#define ERR_NONE           0x00
#define ERR_INVALID_RPC    0x01
#define ERR_UNABLE_CONNECT 0x03

// Commandes RPC
#define RPC_SET_WIFI       0x01
#define RPC_DEVICE_INFO    0x02

static const uint8_t HDR[6] = {'I','M','P','R','O','V'};

void ImprovWifi::begin(Config& config) {
    _config = &config;
}

uint8_t ImprovWifi::_checksum(const uint8_t* buf, size_t len) {
    uint8_t cs = 0;
    for (size_t i = 0; i < len; i++) cs ^= buf[i];
    return cs;
}

void ImprovWifi::_sendPacket(uint8_t type, const uint8_t* data, size_t len) {
    uint8_t hdr[9];
    memcpy(hdr, HDR, 6);
    hdr[6] = 1;            // version
    hdr[7] = type;
    hdr[8] = (uint8_t)len;

    uint8_t cs = _checksum(hdr, 9);
    for (size_t i = 0; i < len; i++) cs ^= data[i];

    Serial.write(hdr, 9);
    if (data && len) Serial.write(data, len);
    Serial.write(cs);
}

void ImprovWifi::_sendCurrentState() {
    uint8_t state = (WiFi.status() == WL_CONNECTED) ? STATE_PROVISIONED : STATE_AUTHORIZED;
    _sendPacket(IMPROV_TYPE_STATE, &state, 1);
}

void ImprovWifi::_handleSetWifi(const uint8_t* data, size_t len) {
    // data: [ssid_len, ssid..., pass_len, pass...]
    if (len < 2) {
        uint8_t err = ERR_INVALID_RPC;
        _sendPacket(IMPROV_TYPE_ERROR, &err, 1);
        return;
    }

    uint8_t ssidLen = data[0];
    if (len < (size_t)(1 + ssidLen + 1)) {
        uint8_t err = ERR_INVALID_RPC;
        _sendPacket(IMPROV_TYPE_ERROR, &err, 1);
        return;
    }

    char ssid[64] = {};
    memcpy(ssid, data + 1, min((int)ssidLen, 63));

    uint8_t passLen = data[1 + ssidLen];
    char pass[64] = {};
    if (len >= (size_t)(2 + ssidLen + passLen)) {
        memcpy(pass, data + 2 + ssidLen, min((int)passLen, 63));
    }

    Serial.printf("[Improv] SSID: %s\n", ssid);

    // Sauvegarde dans la config
    strlcpy(_config->data.wifiSSID,     ssid, sizeof(_config->data.wifiSSID));
    strlcpy(_config->data.wifiPassword, pass, sizeof(_config->data.wifiPassword));
    _config->save();

    // Tentative de connexion
    uint8_t provState = STATE_PROVISIONING;
    _sendPacket(IMPROV_TYPE_STATE, &provState, 1);

    WiFi.disconnect();
    WiFi.begin(ssid, pass);

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(200);
    }

    if (WiFi.status() == WL_CONNECTED) {
        String url = "http://" + WiFi.localIP().toString();
        Serial.printf("[Improv] Connecté ! IP: %s\n", url.c_str());

        // Résultat RPC : [cmd, success=1, url_len, url...]
        uint8_t result[3 + url.length()];
        result[0] = RPC_SET_WIFI;
        result[1] = 0x01;                      // succès
        result[2] = (uint8_t)url.length();
        memcpy(result + 3, url.c_str(), url.length());
        _sendPacket(IMPROV_TYPE_RPC_RESULT, result, sizeof(result));

        uint8_t done = STATE_PROVISIONED;
        _sendPacket(IMPROV_TYPE_STATE, &done, 1);
        delay(1000);
        ESP.restart();

    } else {
        Serial.println("[Improv] Connexion échouée");
        // Résultat RPC : [cmd, success=0, url_len=0]
        uint8_t result[3] = {RPC_SET_WIFI, 0x00, 0x00};
        _sendPacket(IMPROV_TYPE_RPC_RESULT, result, 3);
        uint8_t err = ERR_UNABLE_CONNECT;
        _sendPacket(IMPROV_TYPE_ERROR, &err, 1);
    }
}

void ImprovWifi::_handleDeviceInfo() {
    String fwName  = "DMX LED Controller";
    String fwVer   = FIRMWARE_VERSION;
    String chipVar = "ESP32";
    String devName = String(_config->data.deviceName);

    // [cmd, n_len, n..., fwv_len, fwv..., chip_len, chip..., dev_len, dev...]
    size_t totalLen = 1
        + 1 + fwName.length()
        + 1 + fwVer.length()
        + 1 + chipVar.length()
        + 1 + devName.length();

    uint8_t* buf = new uint8_t[totalLen];
    size_t   pos = 0;
    buf[pos++] = RPC_DEVICE_INFO;

    auto ws = [&](const String& s) {
        buf[pos++] = (uint8_t)s.length();
        memcpy(buf + pos, s.c_str(), s.length());
        pos += s.length();
    };
    ws(fwName); ws(fwVer); ws(chipVar); ws(devName);

    _sendPacket(IMPROV_TYPE_RPC_RESULT, buf, pos);
    delete[] buf;
}

void ImprovWifi::_handleRpc(const uint8_t* data, size_t len) {
    if (len == 0) return;
    switch (data[0]) {
        case RPC_SET_WIFI:    _handleSetWifi(data + 1, len - 1); break;
        case RPC_DEVICE_INFO: _handleDeviceInfo();               break;
        default: {
            uint8_t err = ERR_INVALID_RPC;
            _sendPacket(IMPROV_TYPE_ERROR, &err, 1);
        }
    }
}

void ImprovWifi::loop() {
    // Envoie l'état courant toutes les 2s (ESP Web Tools en a besoin pour détecter Improv)
    if (millis() - _lastState > 2000) {
        _sendCurrentState();
        _lastState = millis();
    }

    // Lecture des bytes entrants
    while (Serial.available() && _rxLen < sizeof(_rxBuf)) {
        _rxBuf[_rxLen++] = Serial.read();
    }

    // Recherche et parsing des paquets
    while (_rxLen >= 10) {
        // Cherche le header IMPROV
        size_t start = 0;
        bool   found = false;
        for (; start + 5 < _rxLen; start++) {
            if (memcmp(_rxBuf + start, HDR, 6) == 0) { found = true; break; }
        }

        if (!found) { _rxLen = 0; break; }

        // Élimine les bytes avant le header
        if (start > 0) {
            memmove(_rxBuf, _rxBuf + start, _rxLen - start);
            _rxLen -= start;
        }

        if (_rxLen < 10) break;

        uint8_t dataLen  = _rxBuf[8];
        size_t  totalLen = 9 + dataLen + 1;

        if (_rxLen < totalLen) break; // paquet incomplet, on attend

        // Vérifie le checksum
        if (_checksum(_rxBuf, 9 + dataLen) == _rxBuf[9 + dataLen]) {
            if (_rxBuf[7] == IMPROV_TYPE_RPC) {
                _handleRpc(_rxBuf + 9, dataLen);
            }
        }

        memmove(_rxBuf, _rxBuf + totalLen, _rxLen - totalLen);
        _rxLen -= totalLen;
    }
}
