#include "LedController.h"

void LedController::begin(DeviceConfig& config) {
    _config   = &config;
    _ledCount = min((uint16_t)MAX_LEDS, _config->ledCount);

    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(_leds, MAX_LEDS);
    FastLED.setBrightness(_config->brightness);
    FastLED.setMaxRefreshRate(_config->fpsMax);

    clear();
    show();

    Serial.printf("[LED] Initialisé : %d LEDs sur GPIO%d\n",
                  _ledCount, LED_DATA_PIN);
}

void LedController::show() {
    FastLED.show();
}

void LedController::clear() {
    fill_solid(_leds, _ledCount, CRGB::Black);
}

void LedController::setPixel(uint16_t index, uint8_t r, uint8_t g, uint8_t b) {
    if (index >= _ledCount) return;
    _leds[index] = CRGB(r, g, b);
}

void LedController::setAll(uint8_t r, uint8_t g, uint8_t b) {
    fill_solid(_leds, _ledCount, CRGB(r, g, b));
}

void LedController::setBrightness(uint8_t brightness) {
    FastLED.setBrightness(brightness);
}

void LedController::applyDMX(uint8_t* dmxData, uint16_t dmxLength) {
    // Le buffer reçu est déjà fusionné par ArtNet
    // Il commence directement à la LED 0 — pas besoin d'offset ici
    // L'offset du canal de départ est géré dans ArtNet._buildMergedBuffer

    switch (_config->dmxMode) {
        case 0: _applyFullPixel(dmxData, dmxLength); break;
        case 1: _applyGrouped(dmxData, dmxLength);   break;
        case 2: _applyFullBar(dmxData, dmxLength);   break;
        default: break;
    }
}

// ─── Mode 0 : Full Pixel ──────────────────────────────────────────────────────
void LedController::_applyFullPixel(uint8_t* data, uint16_t length) {
    for (uint16_t i = 0; i < _ledCount; i++) {
        uint16_t ch = i * 3;
        if (ch + 2 >= length) break;
        _leds[i] = CRGB(data[ch], data[ch + 1], data[ch + 2]);
    }
}

// ─── Mode 1 : Grouped Pixels ─────────────────────────────────────────────────
void LedController::_applyGrouped(uint8_t* data, uint16_t length) {
    uint8_t  groupSize = max((uint8_t)1, _config->dmxGroupSize);
    uint16_t numGroups = (_ledCount + groupSize - 1) / groupSize;

    for (uint16_t g = 0; g < numGroups; g++) {
        uint16_t ch = g * 3;
        if (ch + 2 >= length) break;

        CRGB color = CRGB(data[ch], data[ch + 1], data[ch + 2]);

        for (uint8_t j = 0; j < groupSize; j++) {
            uint16_t ledIndex = g * groupSize + j;
            if (ledIndex >= _ledCount) break;
            _leds[ledIndex] = color;
        }
    }
}

// ─── Mode 2 : Full Bar Color ─────────────────────────────────────────────────
void LedController::_applyFullBar(uint8_t* data, uint16_t length) {
    if (length < 3) return;
    fill_solid(_leds, _ledCount, CRGB(data[0], data[1], data[2]));
}