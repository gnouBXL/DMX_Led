#pragma once
#include <Arduino.h>
#include <FastLED.h>
#include "../config/Config.h"

// Un contrôleur par bande LED
class StripController {
public:
    void begin(StripConfig& config, uint8_t brightness);
    void show();
    void clear();

    void setPixel(uint16_t index, uint8_t r, uint8_t g, uint8_t b);
    void setAll(uint8_t r, uint8_t g, uint8_t b);
    void setBrightness(uint8_t brightness);

    void applyDMX(uint8_t* dmxData, uint16_t dmxLength);

    CRGB*    leds     = nullptr;
    uint16_t ledCount = 0;
    bool     active   = false;

private:
    StripConfig* _config = nullptr;

    void _applyFullPixel(uint8_t* data, uint16_t length);
    void _applyGrouped(uint8_t* data, uint16_t length);
    void _applyFullBar(uint8_t* data, uint16_t length);
};

// Gestionnaire global — tableau de StripController
class LedController {
public:
    void begin(DeviceConfig& config);
    void show();
    void clear();
    void setBrightness(uint8_t brightness);

    // Accès à une bande spécifique
    StripController& getStrip(uint8_t index);
    uint8_t          stripCount();

private:
    DeviceConfig*    _config = nullptr;
    StripController  _strips[MAX_STRIPS];

    // Buffers LED statiques — un par bande
    CRGB _buf0[MAX_LEDS_PER_STRIP];
    CRGB _buf1[MAX_LEDS_PER_STRIP];
    CRGB _buf2[MAX_LEDS_PER_STRIP];
    CRGB _buf3[MAX_LEDS_PER_STRIP];
};