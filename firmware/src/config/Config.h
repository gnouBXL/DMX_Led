#pragma once
#include <Preferences.h>
#include <Arduino.h>

// ─── Limites ─────────────────────────────────────────────────────────────────────────────────
#ifndef MAX_STRIPS
#define MAX_STRIPS          4
#endif
#define MAX_LEDS_PER_STRIP  300

// ─── GPIO disponibles pour les bandes LED ────────────────────────────────────────────
// RMT canaux 0-3 sur ESP32-S3 DevKitC-1
#define VALID_PINS_COUNT    4
static const uint8_t VALID_PINS[VALID_PINS_COUNT] = { 4, 5, 6, 7 };

// ─── Modes DMX ────────────────────────────────────────────────────────────────────────────
#define DMX_MODE_FULL_PIXEL  0
#define DMX_MODE_GROUPED     1
#define DMX_MODE_FULL_BAR    2

// ─── Modes univers ────────────────────────────────────────────────────────────────────────────
#define UNIVERSE_MODE_MANUAL   0
#define UNIVERSE_MODE_CONT     1
#define UNIVERSE_MODE_ALIGNED  2

// ─── Valeurs par défaut globales ──────────────────────────────────────────────────────────────
#define DEFAULT_DEVICE_NAME   "barre-led-1"
#define DEFAULT_BRIGHTNESS    255
#define DEFAULT_FPS_MAX       40
#define DEFAULT_TIMEOUT_MS    5000

// ─── Config d'une bande LED ────────────────────────────────────────────────────────────────────
struct StripConfig {
    bool     enabled;              // bande active ou non
    uint8_t  pin;                  // GPIO data (4, 5, 6 ou 7)
    char     name[24];             // nom de la bande
    uint16_t ledCount;             // nombre de LEDs
    uint8_t  dmxUniverse;          // univers DMX principal
    uint16_t dmxStartChannel;      // canal de départ (1-512)
    uint8_t  dmxMode;              // Full Pixel / Grouped / Full Bar
    uint8_t  dmxGroupSize;         // LEDs par groupe (mode Grouped)

    // Multi-univers
    uint8_t  universe2;            // 2ème univers (0 = désactivé)
    uint16_t universe2StartCh;     // canal départ dans U2
    uint16_t universe2LedStart;    // LED de départ dans U2 (mode Manuel)
    uint8_t  universeMode;         // Manuel / Continuation / PixelAligned

    // ── Calculs automatiques ─────────────────────────────────────────────────────────────────
    uint16_t totalChannels() const {
        switch (dmxMode) {
            case DMX_MODE_FULL_PIXEL: return ledCount * 3;
            case DMX_MODE_GROUPED:    return (ledCount / max((uint8_t)1, dmxGroupSize)) * 3;
            case DMX_MODE_FULL_BAR:   return 3;
            default: return 0;
        }
    }

    uint16_t lastChannel() const {
        uint16_t ch = totalChannels();
        if (universe2 == 0 || ch <= (512 - dmxStartChannel + 1)) {
            return dmxStartChannel + ch - 1;
        }
        // Multi-univers : dernier canal dans U2
        uint16_t chInU1 = 512 - dmxStartChannel + 1;
        uint16_t chInU2 = ch - chInU1;
        return universe2StartCh + chInU2 - 1;
    }

    uint16_t calcUniverse2LedStart() const {
        if (universe2 == 0) return 0;
        switch (universeMode) {
            case UNIVERSE_MODE_MANUAL:  return universe2LedStart;
            case UNIVERSE_MODE_CONT:    return (512 - dmxStartChannel + 1) / 3;
            case UNIVERSE_MODE_ALIGNED: return (512 - dmxStartChannel + 1) / 3;
            default: return universe2LedStart;
        }
    }

    uint8_t calcUniverse1Skip() const {
        if (universeMode != UNIVERSE_MODE_ALIGNED || universe2 == 0) return 0;
        uint16_t chInU1 = 512 - dmxStartChannel + 1;
        uint16_t rem    = chInU1 % 3;
        return (rem == 0) ? 0 : (3 - rem);
    }
};

// ─── Config globale de l'ESP32 ────────────────────────────────────────────────────────────────
struct DeviceConfig {
    char    deviceName[32];
    uint8_t brightness;
    uint8_t fpsMax;
    uint32_t timeoutMs;
    char    wifiSSID[64];
    char    wifiPassword[64];

    uint8_t    stripCount;              // nombre de bandes actives
    StripConfig strips[MAX_STRIPS];     // config de chaque bande
};

// ─── Classe Config ────────────────────────────────────────────────────────────────────────────────
class Config {
public:
    DeviceConfig data;

    void load();
    void save();
    void reset();
    void print();

    // Valeurs par défaut pour une bande
    static StripConfig defaultStrip(uint8_t index);

private:
    Preferences _prefs;
};
