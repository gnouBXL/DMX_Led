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

    // Si pas de nom sauvegardé, applique le nom par défaut
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

    _prefs.end();
}

void Config::reset() {
    _prefs.begin("ledconfig", false);
    _prefs.clear();
    _prefs.end();
    load(); // recharge les valeurs par défaut
}

void Config::print() {
    Serial.println("=== Configuration ===");
    Serial.printf("Nom         : %s\n", data.deviceName);
    Serial.printf("Wi-Fi SSID  : %s\n", data.wifiSSID);
    Serial.printf("LEDs        : %d\n", data.ledCount);
    Serial.printf("Univers DMX : %d\n", data.dmxUniverse);
    Serial.printf("Canal start : %d\n", data.dmxStartChannel);
    Serial.printf("Mode DMX    : %d\n", data.dmxMode);
    Serial.printf("Brightness  : %d\n", data.brightness);
    Serial.printf("FPS max     : %d\n", data.fpsMax);
    Serial.printf("Timeout     : %d ms\n", data.timeoutMs);
    Serial.println("====================");
}