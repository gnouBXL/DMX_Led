#include "LedController.h"

// ─── StripController ──────────────────────────────────────────────────────────

void StripController::begin(StripConfig& config, uint8_t brightness) {
    _config  = &config;
    ledCount = min((uint16_t)MAX_LEDS_PER_STRIP, config.ledCount);
    active   = config.enabled;

    if (!active || leds == nullptr) return;

    FastLED.setBrightness(brightness);
    clear();

    Serial.printf("[LED] Bande '%s' : %d LEDs sur GPIO%d\n",
                  config.name, ledCount, config.pin);
}

void StripController::show() {
    if (!active) return;
    FastLED.show();
}

void StripController::clear() {
    if (!active || leds == nullptr) return;
    fill_solid(leds, ledCount, CRGB::Black);
}

void StripController::setPixel(uint16_t index, uint8_t r, uint8_t g, uint8_t b) {
    if (!active || leds == nullptr || index >= ledCount) return;
    leds[index] = CRGB(r, g, b);
}

void StripController::setAll(uint8_t r, uint8_t g, uint8_t b) {
    if (!active || leds == nullptr) return;
    fill_solid(leds, ledCount, CRGB(r, g, b));
}

void StripController::setBrightness(uint8_t brightness) {
    FastLED.setBrightness(brightness);
}

void StripController::applyDMX(uint8_t* dmxData, uint16_t dmxLength) {
    if (!active || leds == nullptr) return;
    switch (_config->dmxMode) {
        case DMX_MODE_FULL_PIXEL: _applyFullPixel(dmxData, dmxLength); break;
        case DMX_MODE_GROUPED:    _applyGrouped(dmxData, dmxLength);   break;
        case DMX_MODE_FULL_BAR:   _applyFullBar(dmxData, dmxLength);   break;
    }
}

void StripController::_applyFullPixel(uint8_t* data, uint16_t length) {
    for (uint16_t i = 0; i < ledCount; i++) {
        uint16_t ch = i * 3;
        if (ch + 2 >= length) break;
        leds[i] = CRGB(data[ch], data[ch+1], data[ch+2]);
    }
}

void StripController::_applyGrouped(uint8_t* data, uint16_t length) {
    uint8_t  gs  = max((uint8_t)1, _config->dmxGroupSize);
    uint16_t num = (ledCount + gs - 1) / gs;
    for (uint16_t g = 0; g < num; g++) {
        uint16_t ch = g * 3;
        if (ch + 2 >= length) break;
        CRGB color = CRGB(data[ch], data[ch+1], data[ch+2]);
        for (uint8_t j = 0; j < gs; j++) {
            uint16_t idx = g * gs + j;
            if (idx >= ledCount) break;
            leds[idx] = color;
        }
    }
}

void StripController::_applyFullBar(uint8_t* data, uint16_t length) {
    if (length < 3) return;
    fill_solid(leds, ledCount, CRGB(data[0], data[1], data[2]));
}

// ─── LedController ────────────────────────────────────────────────────────────

void LedController::begin(DeviceConfig& config) {
    _config = &config;

    // Associe chaque buffer à sa bande
    CRGB* bufs[MAX_STRIPS] = { _buf0, _buf1, _buf2, _buf3 };

    // Pins correspondantes à chaque bande
    // FastLED nécessite des templates au compile-time pour les pins
    // On utilise une astuce : on ajoute toutes les bandes actives
    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        _strips[i].leds = bufs[i];

        if (!config.strips[i].enabled) {
            _strips[i].active = false;
            continue;
        }

        // Initialise le buffer FastLED selon le GPIO configuré
        uint8_t pin = config.strips[i].pin;
        switch (pin) {
            case 4: FastLED.addLeds<WS2812B, 4, GRB>(bufs[i], MAX_LEDS_PER_STRIP); break;
            case 5: FastLED.addLeds<WS2812B, 5, GRB>(bufs[i], MAX_LEDS_PER_STRIP); break;
            case 6: FastLED.addLeds<WS2812B, 6, GRB>(bufs[i], MAX_LEDS_PER_STRIP); break;
            case 7: FastLED.addLeds<WS2812B, 7, GRB>(bufs[i], MAX_LEDS_PER_STRIP); break;
            default:
                Serial.printf("[LED] GPIO %d non supporté\n", pin);
                config.strips[i].enabled = false;
                continue;
        }

        _strips[i].begin(config.strips[i], config.brightness);
    }

    FastLED.setBrightness(config.brightness);
    FastLED.setMaxRefreshRate(config.fpsMax);

    Serial.printf("[LED] %d bande(s) initialisée(s)\n", config.stripCount);
}

void LedController::show() {
    FastLED.show();
}

void LedController::clear() {
    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        _strips[i].clear();
    }
    FastLED.show();
}

void LedController::setBrightness(uint8_t brightness) {
    FastLED.setBrightness(brightness);
}

StripController& LedController::getStrip(uint8_t index) {
    return _strips[index % MAX_STRIPS];
}

uint8_t LedController::stripCount() {
    return _config ? _config->stripCount : 0;
}