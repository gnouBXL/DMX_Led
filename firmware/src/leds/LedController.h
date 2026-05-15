#pragma once
#include <Arduino.h>
#include <FastLED.h>
#include "../config/Config.h"

#define MAX_LEDS 300

class LedController {
public:
    void begin(DeviceConfig& config);
    void show();
    void clear();

    // Contrôle direct
    void setPixel(uint16_t index, uint8_t r, uint8_t g, uint8_t b);
    void setAll(uint8_t r, uint8_t g, uint8_t b);
    void setBrightness(uint8_t brightness);

    // Mapping DMX → LEDs selon le mode configuré
    void applyDMX(uint8_t* dmxData, uint16_t dmxLength);

private:
    DeviceConfig* _config;
    CRGB          _leds[MAX_LEDS];
    uint16_t      _ledCount = 0;

    void _applyFullPixel(uint8_t* dmxData, uint16_t dmxLength);
    void _applyGrouped(uint8_t* dmxData, uint16_t dmxLength);
    void _applyFullBar(uint8_t* dmxData, uint16_t dmxLength);
};