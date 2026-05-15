#include "Effects.h"

void Effects::begin(CRGB* leds, uint16_t ledCount) {
    _leds     = leds;
    _ledCount = ledCount;
    _step     = 0;
}

void Effects::loop() {
    if (!_leds || _ledCount == 0) return;
    if (_effect == EFFECT_NONE)   return;

    // Tous les effets sont non bloquants
    // Chaque effet vérifie lui-même son timer
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

void Effects::setEffect(EffectType type) {
    _effect = type;
    _step   = 0;
}

void Effects::setColor(uint8_t r, uint8_t g, uint8_t b) {
    _color = CRGB(r, g, b);
}

void Effects::setSpeed(uint8_t speed) {
    _speed = max((uint8_t)1, speed);
}

void Effects::setBrightness(uint8_t brightness) {
    _brightness = brightness;
}

EffectType Effects::getEffect() {
    return _effect;
}

uint32_t Effects::_interval() {
    // speed 1 → 500ms, speed 255 → ~2ms
    return map(_speed, 1, 255, 500, 2);
}

// ─── Solid ────────────────────────────────────────────────────────────────────
void Effects::_runSolid() {
    // Appliqué une seule fois au changement d'effet
    if (_step == 0) {
        fill_solid(_leds, _ledCount, _color);
        _step = 1;
    }
}

// ─── Fade : fondu entrée/sortie ───────────────────────────────────────────────
void Effects::_runFade() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();

    // _step va de 0 à 511 (0-255 montée, 256-511 descente)
    uint8_t brightness;
    if (_step < 256) {
        brightness = _step;
    } else {
        brightness = 511 - _step;
    }

    CRGB color = _color;
    color.nscale8(brightness);
    fill_solid(_leds, _ledCount, color);

    _step = (_step + 3) % 512;
}

// ─── Breathing : respiration douce ───────────────────────────────────────────
void Effects::_runBreathing() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();

    // Courbe sinusoïdale pour un effet plus naturel
    float rad        = (_step / 255.0f) * TWO_PI;
    uint8_t breath   = (uint8_t)((sin(rad) + 1.0f) * 127.5f);

    CRGB color = _color;
    color.nscale8(breath);
    fill_solid(_leds, _ledCount, color);

    _step = (_step + 1) % 256;
}

// ─── Rainbow : arc-en-ciel lent ───────────────────────────────────────────────
void Effects::_runRainbow() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();

    fill_rainbow(_leds, _ledCount, _step, 255 / _ledCount);
    FastLED.setBrightness(_brightness);

    _step = (_step + 1) % 256;
}

// ─── Chase : pixel qui court ──────────────────────────────────────────────────
void Effects::_runChase() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();

    fill_solid(_leds, _ledCount, CRGB::Black);
    _leds[_step % _ledCount] = _color;

    _step = (_step + 1) % _ledCount;
}

// ─── Strobe : flash rapide ────────────────────────────────────────────────────
void Effects::_runStrobe() {
    if (millis() - _lastUpdate < _interval()) return;
    _lastUpdate = millis();

    if (_step % 2 == 0) {
        fill_solid(_leds, _ledCount, _color);
    } else {
        fill_solid(_leds, _ledCount, CRGB::Black);
    }

    _step++;
}