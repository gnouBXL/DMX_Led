#include "Config.h"

void Config::load() {
    _prefs.begin("ledconfig", false);

    _prefs.getString("name",     data.deviceName,   sizeof(data.deviceName));
    _prefs.getString("ssid",     data.wifiSSID,      sizeof(data.wifiSSID));
    _prefs.getString("pass",     data.wifiPassword,  sizeof(data.wifiPassword));

    data.ledCount        = _prefs.getUShort("ledCount",   DEFAULT_LED_COUNT);
    data.dmxUniverse     = _prefs.getUChar("universe",    DEFAULT_DMX_UNIVERSE);
    data.dmxStartChannel = _prefs.getUShort("startCh",    DEFAULT_DMX_START_CH);
    data.dmxMode         = _prefs.getUChar("dmxMode",     DEFAULT_DMX_MODE);
    data.dmxGroupSize    = _prefs.getUChar("groupSize",   DEFAULT_DMX_GROUP_SIZE);
    data.brightness      = _prefs.getUChar("brightness",  DEFAULT_BRIGHTNESS);
    data.fpsMax          = _prefs.getUChar("fpsMax",      DEFAULT_FPS_MAX);
    data.timeoutMs       = _prefs.getULong("timeout",     DEFAULT_TIMEOUT_MS);

    // Multi-univers
    data.universe2          = _prefs.getUChar("univ2",        DEFAULT_UNIVERSE2);
    data.universe2StartCh   = _prefs.getUShort("univ2StartCh", DEFAULT_UNIVERSE2_START_CH);
    data.universe2LedStart  = _prefs.getUShort("univ2LedStart", DEFAULT_UNIVERSE2_LED_START);
    data.universeMode       = _prefs.getUChar("univMode",     DEFAULT_UNIVERSE_MODE);

    if (strlen(data.deviceName) == 0) {
        strlcpy(data.deviceName, DEFAULT_DEVICE_NAME, sizeof(data.deviceName));
    }

    _prefs.end();
}

void Config::save() {
    _prefs.begin("ledconfig", false);

    _prefs.putString("name",      data.deviceName);
    _prefs.putString("ssid",      data.wifiSSID);
    _prefs.putString("pass",      data.wifiPassword);
    _prefs.putUShort("ledCount",  data.ledCount);
    _prefs.putUChar("universe",   data.dmxUniverse);
    _prefs.putUShort("startCh",   data.dmxStartChannel);
    _prefs.putUChar("dmxMode",    data.dmxMode);
    _prefs.putUChar("groupSize",  data.dmxGroupSize);
    _prefs.putUChar("brightness", data.brightness);
    _prefs.putUChar("fpsMax",     data.fpsMax);
    _prefs.putULong("timeout",    data.timeoutMs);

    // Multi-univers
    _prefs.putUChar("univ2",         data.universe2);
    _prefs.putUShort("univ2StartCh", data.universe2StartCh);
    _prefs.putUShort("univ2LedStart",data.universe2LedStart);
    _prefs.putUChar("univMode",      data.universeMode);

    _prefs.end();
}

void Config::reset() {
    _prefs.begin("ledconfig", false);
    _prefs.clear();
    _prefs.end();
    load();
}

void Config::print() {
    Serial.println("=== Configuration ===");
    Serial.printf("Nom          : %s\n", data.deviceName);
    Serial.printf("Wi-Fi SSID   : %s\n", data.wifiSSID);
    Serial.printf("LEDs         : %d\n", data.ledCount);
    Serial.printf("Univers 1    : %d ch.%d\n", data.dmxUniverse, data.dmxStartChannel);
    Serial.printf("Mode DMX     : %d\n", data.dmxMode);
    Serial.printf("Brightness   : %d\n", data.brightness);
    Serial.printf("FPS max      : %d\n", data.fpsMax);
    Serial.printf("Timeout      : %d ms\n", data.timeoutMs);
    if (data.universe2 > 0) {
        Serial.printf("Univers 2    : %d ch.%d\n", data.universe2, data.universe2StartCh);
        Serial.printf("Mode univers : %d\n", data.universeMode);
        Serial.printf("LED start U2 : %d\n", calcUniverse2LedStart());
    }
    Serial.println("====================");
}

// ─── Calcul automatique de la LED de départ dans U2 ──────────────────────────
uint16_t Config::calcUniverse2LedStart() const {
    if (data.universe2 == 0) return 0;

    switch (data.universeMode) {

        case UNIVERSE_MODE_MANUAL:
            // L'utilisateur définit lui-même (TouchDesigner)
            return data.universe2LedStart;

        case UNIVERSE_MODE_CONT: {
            // QLC+ : continuation stricte
            // Canaux disponibles dans U1 à partir du canal de départ
            uint16_t chInU1 = 512 - (data.dmxStartChannel - 1);
            // Nombre de LEDs complètes dans U1
            uint16_t ledsInU1 = chInU1 / 3;
            // Note : la LED ledsInU1+1 peut être partiellement dans U1
            return ledsInU1;
        }

        case UNIVERSE_MODE_ALIGNED: {
            // Resolume : pixel aligné, on skip 1 ou 2 canaux en fin d'U1
            uint16_t chInU1    = 512 - (data.dmxStartChannel - 1);
            uint16_t ledsInU1  = chInU1 / 3;  // division entière = pixel aligné
            return ledsInU1;
        }

        default:
            return data.universe2LedStart;
    }
}

// ─── Calcul du skip en fin d'U1 (Resolume uniquement) ────────────────────────
uint8_t Config::calcUniverse1Skip() const {
    if (data.universeMode != UNIVERSE_MODE_ALIGNED) return 0;
    uint16_t chInU1   = 512 - (data.dmxStartChannel - 1);
    uint16_t remainder = chInU1 % 3;
    return (remainder == 0) ? 0 : (3 - remainder);
}