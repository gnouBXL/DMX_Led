#include "Config.h"

// ─── Valeurs par défaut pour une bande ───────────────────────────────────────
StripConfig Config::defaultStrip(uint8_t index) {
    StripConfig s;
    s.enabled          = (index == 0);  // seule la bande 0 activée par défaut
    s.pin              = VALID_PINS[index % VALID_PINS_COUNT];
    snprintf(s.name, sizeof(s.name), "bande-%d", index + 1);
    s.ledCount         = 100;
    s.dmxUniverse      = 1;
    s.dmxStartChannel  = 1 + (index * 300);  // espacement par défaut
    s.dmxMode          = DMX_MODE_FULL_PIXEL;
    s.dmxGroupSize     = 5;
    s.universe2        = 0;
    s.universe2StartCh = 1;
    s.universe2LedStart= 0;
    s.universeMode     = UNIVERSE_MODE_MANUAL;
    return s;
}

void Config::load() {
    _prefs.begin("ledcfg", false);

    // ── Config globale ─────────────────────────────────────────────────────────
    _prefs.getString("name",   data.deviceName,  sizeof(data.deviceName));
    _prefs.getString("ssid",   data.wifiSSID,    sizeof(data.wifiSSID));
    _prefs.getString("pass",   data.wifiPassword,sizeof(data.wifiPassword));
    data.brightness  = _prefs.getUChar("bright",  DEFAULT_BRIGHTNESS);
    data.fpsMax      = _prefs.getUChar("fps",     DEFAULT_FPS_MAX);
    data.timeoutMs   = _prefs.getULong("timeout", DEFAULT_TIMEOUT_MS);
    data.stripCount  = _prefs.getUChar("strips",  1);

    if (strlen(data.deviceName) == 0)
        strlcpy(data.deviceName, DEFAULT_DEVICE_NAME, sizeof(data.deviceName));

    data.stripCount = constrain(data.stripCount, 1, MAX_STRIPS);

    // ── Config de chaque bande ─────────────────────────────────────────────────
    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        char key[24];

        snprintf(key, sizeof(key), "s%d_en",    i);
        data.strips[i].enabled = _prefs.getBool(key, i == 0);

        snprintf(key, sizeof(key), "s%d_pin",   i);
        data.strips[i].pin = _prefs.getUChar(key, VALID_PINS[i]);

        snprintf(key, sizeof(key), "s%d_name",  i);
        _prefs.getString(key, data.strips[i].name, sizeof(data.strips[i].name));
        if (strlen(data.strips[i].name) == 0)
            snprintf(data.strips[i].name, sizeof(data.strips[i].name), "bande-%d", i+1);

        snprintf(key, sizeof(key), "s%d_leds",  i);
        data.strips[i].ledCount = _prefs.getUShort(key, 100);

        snprintf(key, sizeof(key), "s%d_univ",  i);
        data.strips[i].dmxUniverse = _prefs.getUChar(key, 1);

        snprintf(key, sizeof(key), "s%d_ch",    i);
        data.strips[i].dmxStartChannel = _prefs.getUShort(key, 1);

        snprintf(key, sizeof(key), "s%d_mode",  i);
        data.strips[i].dmxMode = _prefs.getUChar(key, DMX_MODE_FULL_PIXEL);

        snprintf(key, sizeof(key), "s%d_grp",   i);
        data.strips[i].dmxGroupSize = _prefs.getUChar(key, 5);

        snprintf(key, sizeof(key), "s%d_u2",    i);
        data.strips[i].universe2 = _prefs.getUChar(key, 0);

        snprintf(key, sizeof(key), "s%d_u2ch",  i);
        data.strips[i].universe2StartCh = _prefs.getUShort(key, 1);

        snprintf(key, sizeof(key), "s%d_u2ls",  i);
        data.strips[i].universe2LedStart = _prefs.getUShort(key, 0);

        snprintf(key, sizeof(key), "s%d_umode", i);
        data.strips[i].universeMode = _prefs.getUChar(key, UNIVERSE_MODE_MANUAL);
    }

    _prefs.end();
}

void Config::save() {
    _prefs.begin("ledcfg", false);

    _prefs.putString("name",   data.deviceName);
    _prefs.putString("ssid",   data.wifiSSID);
    _prefs.putString("pass",   data.wifiPassword);
    _prefs.putUChar("bright",  data.brightness);
    _prefs.putUChar("fps",     data.fpsMax);
    _prefs.putULong("timeout", data.timeoutMs);
    _prefs.putUChar("strips",  data.stripCount);

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        char key[24];

        snprintf(key, sizeof(key), "s%d_en",    i); _prefs.putBool(key,    data.strips[i].enabled);
        snprintf(key, sizeof(key), "s%d_pin",   i); _prefs.putUChar(key,   data.strips[i].pin);
        snprintf(key, sizeof(key), "s%d_name",  i); _prefs.putString(key,  data.strips[i].name);
        snprintf(key, sizeof(key), "s%d_leds",  i); _prefs.putUShort(key,  data.strips[i].ledCount);
        snprintf(key, sizeof(key), "s%d_univ",  i); _prefs.putUChar(key,   data.strips[i].dmxUniverse);
        snprintf(key, sizeof(key), "s%d_ch",    i); _prefs.putUShort(key,  data.strips[i].dmxStartChannel);
        snprintf(key, sizeof(key), "s%d_mode",  i); _prefs.putUChar(key,   data.strips[i].dmxMode);
        snprintf(key, sizeof(key), "s%d_grp",   i); _prefs.putUChar(key,   data.strips[i].dmxGroupSize);
        snprintf(key, sizeof(key), "s%d_u2",    i); _prefs.putUChar(key,   data.strips[i].universe2);
        snprintf(key, sizeof(key), "s%d_u2ch",  i); _prefs.putUShort(key,  data.strips[i].universe2StartCh);
        snprintf(key, sizeof(key), "s%d_u2ls",  i); _prefs.putUShort(key,  data.strips[i].universe2LedStart);
        snprintf(key, sizeof(key), "s%d_umode", i); _prefs.putUChar(key,   data.strips[i].universeMode);
    }

    _prefs.end();
}

void Config::reset() {
    _prefs.begin("ledcfg", false);
    _prefs.clear();
    _prefs.end();
    load();
}

void Config::print() {
    Serial.printf("\n=== %s ===\n", data.deviceName);
    Serial.printf("Wi-Fi : %s\n", data.wifiSSID);
    Serial.printf("Bandes actives : %d\n", data.stripCount);

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        StripConfig& s = data.strips[i];
        if (!s.enabled) continue;
        Serial.printf("\nBande %d — %s (GPIO %d)\n", i+1, s.name, s.pin);
        Serial.printf("  LEDs       : %d\n", s.ledCount);
        Serial.printf("  Univers 1  : %d · ch %d→%d\n",
                      s.dmxUniverse, s.dmxStartChannel,
                      min((uint16_t)512, (uint16_t)(s.dmxStartChannel + s.totalChannels() - 1)));
        if (s.universe2 > 0) {
            Serial.printf("  Univers 2  : %d · ch %d→%d\n",
                          s.universe2, s.universe2StartCh, s.lastChannel());
        }
        Serial.printf("  Canaux tot : %d\n", s.totalChannels());
    }
    Serial.println("==================");
}