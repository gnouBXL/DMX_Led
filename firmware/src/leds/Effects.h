#pragma once
#include <Arduino.h>
#include <FastLED.h>
#include "../config/Config.h"

// Types d'effets disponibles
enum EffectType {
    EFFECT_NONE       = 0,
    EFFECT_SOLID      = 1,
    EFFECT_FADE       = 2,
    EFFECT_BREATHING  = 3,
    EFFECT_RAINBOW    = 4,
    EFFECT_CHASE      = 5,
    EFFECT_STROBE     = 6
};

class Effects {
public:
    void begin(CRGB* leds, uint16_t ledCount);
    void loop();

    // Configuration effet
    void setEffect(EffectType type);
    void setColor(uint8_t r, uint8_t g, uint8_t b);
    void setSpeed(uint8_t speed);      // 1=lent, 255=rapide
    void setBrightness(uint8_t brightness);

    EffectType getEffect();

private:
    CRGB*      _leds     = nullptr;
    uint16_t   _ledCount = 0;

    EffectType _effect     = EFFECT_SOLID;
    CRGB       _color      = CRGB::White;
    uint8_t    _speed      = 50;
    uint8_t    _brightness = 255;

    // Timers non bloquants
    uint32_t _lastUpdate = 0;
    uint16_t _step       = 0;

    // Fonctions effets
    void _runSolid();
    void _runFade();
    void _runBreathing();
    void _runRainbow();
    void _runChase();
    void _runStrobe();

    // Utilitaire : délai en ms selon speed
    uint32_t _interval();
};