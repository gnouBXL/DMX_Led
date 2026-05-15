#include "Effects.h"

// ─── StripEffect ──────────────────────────────────────────────────────────────

void StripEffect::begin(CRGB* leds, uint16_t ledCount) {
    _leds     = leds;
    _ledCount = ledCount;
    _step     = 0;
}

void StripEffect::loop() {
    if (!_leds || _ledCount == 0) return;
    if (_effect == EFFECT_NONE) return;

    switch (_effect) {
        case EFFECT_SOLID:     _runSolid();     break;
        case EFFECT_FADE:      _runFade();      break;
        case EFFECT_BREATHING: _runBreathing(); break;
        case EFFECT_RAINBOW:   _runRainbow();   break;
        case EFFECT_CHASE:     _runChase();     break;
        case EFFECT_STROBE:    _runStrobe();    break;
        default: break;
    }
}

void StripEffect::setEffect(EffectType type) {
    _effect = type;
    _step   = 0;
}

void StripEffect::setColor(uint8_t r, uint8_t g, uint8_t b) {
    _color = CRGB(r, g, b);
}

void StripEffect::setSpeed(uint8_t speed) {
    _speed = max((uint8_t)1, speed);
}

void StripEffect::setBrightness(uint8_t brightness) {
    _brightness = brightness;
}

uint32_t StripEffect::_interval() {
    return map(_speed, 1, 255, 500, 2);
}

void StripEffect::_runSolid() {
    if (_step == 0) {
        fill_solid(_leds, _ledCount, _color);
        _step = 1;
    }
}

void StripEffect::_runFade() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();
    uint8_t brightness = (_step < 256) ? _step : (511 - _step);
    CRGB color = _color;
    color.nscale8(brightness);
    fill_solid(_leds, _ledCount, color);
    _step = (_step + 3) % 512;
}

void StripEffect::_runBreathing() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();
    float rad      = (_step / 255.0f) * TWO_PI;
    uint8_t breath = (uint8_t)((sin(rad) + 1.0f) * 127.5f);
    CRGB color = _color;
    color.nscale8(breath);
    fill_solid(_leds, _ledCount, color);
    _step = (_step + 1) % 256;
}

void StripEffect::_runRainbow() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();
    fill_rainbow(_leds, _ledCount, _step, 255 / _ledCount);
    FastLED.setBrightness(_brightness);
    _step = (_step + 1) % 256;
}

void StripEffect::_runChase() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();
    fill_solid(_leds, _ledCount, CRGB::Black);
    _leds[_step % _ledCount] = _color;
    _step = (_step + 1) % _ledCount;
}

void StripEffect::_runStrobe() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();
    if (_step % 2 == 0) fill_solid(_leds, _ledCount, _color);
    else                 fill_solid(_leds, _ledCount, CRGB::Black);
    _step++;
}

// ─── Effects (gestionnaire global) ───────────────────────────────────────────

void Effects::begin(CRGB** ledBuffers, uint16_t* ledCounts, uint8_t count) {
    _count = min(count, (uint8_t)4);
    for (uint8_t i = 0; i < _count; i++) {
        _strips[i].begin(ledBuffers[i], ledCounts[i]);
        _strips[i].setEffect(EFFECT_BREATHING);
        _strips[i].setColor(0, 0, 50);  // bleu doux par défaut
    }
}

void Effects::loop() {
    for (uint8_t i = 0; i < _count; i++) {
        _strips[i].loop();
    }
}

void Effects::setEffect(uint8_t stripIndex, EffectType type) {
    if (stripIndex < _count) _strips[stripIndex].setEffect(type);
}

void Effects::setColor(uint8_t stripIndex, uint8_t r, uint8_t g, uint8_t b) {
    if (stripIndex < _count) _strips[stripIndex].setColor(r, g, b);
}

void Effects::setSpeed(uint8_t stripIndex, uint8_t speed) {
    if (stripIndex < _count) _strips[stripIndex].setSpeed(speed);
}

void Effects::setAll(EffectType type) {
    for (uint8_t i = 0; i < _count; i++) {
        _strips[i].setEffect(type);
    }
}

StripEffect& Effects::getStrip(uint8_t index) {
    return _strips[index % 4];
}