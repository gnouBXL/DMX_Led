#pragma once
#include <Arduino.h>
#include <FastLED.h>

enum EffectType {
    EFFECT_NONE       = 0,
    EFFECT_SOLID      = 1,
    EFFECT_FADE       = 2,
    EFFECT_BREATHING  = 3,
    EFFECT_RAINBOW    = 4,
    EFFECT_CHASE      = 5,
    EFFECT_STROBE     = 6
};

// Un effet par bande — léger et non bloquant
class StripEffect {
public:
    void begin(CRGB* leds, uint16_t ledCount);
    void loop();

    void setEffect(EffectType type);
    void setColor(uint8_t r, uint8_t g, uint8_t b);
    void setSpeed(uint8_t speed);
    void setBrightness(uint8_t brightness);

    EffectType getEffect() { return _effect; }

private:
    CRGB*      _leds      = nullptr;
    uint16_t   _ledCount  = 0;
    EffectType _effect    = EFFECT_SOLID;
    CRGB       _color     = CRGB::White;
    uint8_t    _speed     = 50;
    uint8_t    _brightness= 255;
    uint32_t   _lastUpdate= 0;
    uint16_t   _step      = 0;

    uint32_t _interval();
    void _runSolid();
    void _runFade();
    void _runBreathing();
    void _runRainbow();
    void _runChase();
    void _runStrobe();
};

// Gestionnaire global — un effet par bande
class Effects {
public:
    void begin(CRGB** ledBuffers, uint16_t* ledCounts, uint8_t count);

    void loop();

    void setEffect(uint8_t stripIndex, EffectType type);
    void setColor(uint8_t stripIndex, uint8_t r, uint8_t g, uint8_t b);
    void setSpeed(uint8_t stripIndex, uint8_t speed);
    void setAll(EffectType type);  // applique à toutes les bandes

    StripEffect& getStrip(uint8_t index);

private:
    StripEffect _strips[4];
    uint8_t     _count = 0;
};