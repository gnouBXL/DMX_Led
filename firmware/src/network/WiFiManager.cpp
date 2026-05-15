#include "WiFiManager.h"

#define RETRY_INTERVAL_MS   5000   // réessai toutes les 5s
#define MAX_RETRIES         10     // après 10 échecs → mode AP
#define CONNECT_TIMEOUT_MS  15000  // timeout connexion

void WiFiManager::begin(DeviceConfig& config) {
    _config = &config;
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);

    if (strlen(_config->wifiSSID) == 0) {
        // Pas de Wi-Fi configuré → mode AP directement
        Serial.println("[WiFi] Pas de SSID configuré → mode AP");
        _startAPMode();
    } else {
        _connectToWifi();
    }
}

void WiFiManager::loop() {
    switch (_state) {

        case WIFI_STATE_CONNECTING:
            if (WiFi.status() == WL_CONNECTED) {
                _state      = WIFI_STATE_CONNECTED;
                _retryCount = 0;
                Serial.printf("[WiFi] Connecté ! IP : %s\n",
                              WiFi.localIP().toString().c_str());
                _startMDNS();
            } else if (millis() - _lastAttempt > CONNECT_TIMEOUT_MS) {
                _retryCount++;
                Serial.printf("[WiFi] Timeout. Tentative %d/%d\n",
                              _retryCount, MAX_RETRIES);
                if (_retryCount >= MAX_RETRIES) {
                    _startAPMode();
                } else {
                    _connectToWifi();
                }
            }
            break;

        case WIFI_STATE_CONNECTED:
            if (WiFi.status() != WL_CONNECTED) {
                _state = WIFI_STATE_DISCONNECTED;
                Serial.println("[WiFi] Connexion perdue. Reconnexion...");
                _connectToWifi();
            }
            break;

        case WIFI_STATE_DISCONNECTED:
            if (millis() - _lastAttempt > RETRY_INTERVAL_MS) {
                _connectToWifi();
            }
            break;

        case WIFI_STATE_AP_MODE:
            // En mode AP, rien à faire ici
            break;
    }
}

void WiFiManager::_connectToWifi() {
    Serial.printf("[WiFi] Connexion à : %s\n", _config->wifiSSID);
    WiFi.begin(_config->wifiSSID, _config->wifiPassword);
    _state       = WIFI_STATE_CONNECTING;
    _lastAttempt = millis();
}

void WiFiManager::_startAPMode() {
    String apName = String("LED-SETUP-") + String(_config->deviceName);
    Serial.printf("[WiFi] Démarrage mode AP : %s\n", apName.c_str());
    WiFi.mode(WIFI_AP);
    WiFi.softAP(apName.c_str(), "ledsetup123");
    _state = WIFI_STATE_AP_MODE;
    Serial.printf("[WiFi] AP IP : %s\n",
                  WiFi.softAPIP().toString().c_str());
}

void WiFiManager::_startMDNS() {
    if (MDNS.begin(_config->deviceName)) {
        MDNS.addService("http", "tcp", 80);
        MDNS.addService("artnet", "udp", 6454);
        Serial.printf("[mDNS] Accessible via : %s.local\n",
                      _config->deviceName);
    }
}

bool WiFiManager::isConnected() {
    return _state == WIFI_STATE_CONNECTED;
}

WiFiState WiFiManager::getState() {
    return _state;
}

String WiFiManager::getIP() {
    if (_state == WIFI_STATE_AP_MODE) {
        return WiFi.softAPIP().toString();
    }
    return WiFi.localIP().toString();
}

int WiFiManager::getRSSI() {
    return WiFi.RSSI();
}