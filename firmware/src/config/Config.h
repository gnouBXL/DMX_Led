#pragma once
#include <Preferences.h>
#include <Arduino.h>

// ─── Valeurs par défaut ───────────────────────────────────────────────────────
#define DEFAULT_DEVICE_NAME     "barre-led-1"
#define DEFAULT_LED_COUNT       100
#define DEFAULT_DMX_UNIVERSE    1
#define DEFAULT_DMX_START_CH    1
#define DEFAULT_DMX_MODE        0      // 0=FullPixel, 1=Grouped, 2=FullBar
#define DEFAULT_DMX_GROUP_SIZE  5
#define DEFAULT_BRIGHTNESS      255
#define DEFAULT_FPS_MAX         40
#define DEFAULT_TIMEOUT_MS      5000

// Multi-univers
#define DEFAULT_UNIVERSE2           0  // 0 = désactivé
#define DEFAULT_UNIVERSE2_START_CH  1
#define DEFAULT_UNIVERSE2_LED_START 0  // calculé automatiquement si mode != 0
#define DEFAULT_UNIVERSE_MODE       0  // 0=Manuel, 1=Continuation(QLC+), 2=PixelAligned(Resolume)

#define LED_DATA_PIN            48     // GPIO48 sur ESP32-S3 DevKitC

// ─── Modes univers ────────────────────────────────────────────────────────────
#define UNIVERSE_MODE_MANUAL    0   // TouchDesigner : tu définis universe2LedStart
#define UNIVERSE_MODE_CONT      1   // QLC+ : continuation stricte, pixel peut être coupé
#define UNIVERSE_MODE_ALIGNED   2   // Resolume : pixel aligné, skip en fin d'U1

// ─── Structure de configuration ───────────────────────────────────────────────
struct DeviceConfig {
    char     deviceName[32];
    uint16_t ledCount;
    uint8_t  dmxUniverse;
    uint16_t dmxStartChannel;
    uint8_t  dmxMode;
    uint8_t  dmxGroupSize;
    uint8_t  brightness;
    uint8_t  fpsMax;
    uint32_t timeoutMs;
    char     wifiSSID[64];
    char     wifiPassword[64];

    // ── Multi-univers ──────────────────────────────────────────────────────────
    uint8_t  universe2;            // numéro du 2ème univers (0 = désactivé)
    uint16_t universe2StartCh;     // canal de départ dans l'univers 2
    uint16_t universe2LedStart;    // index LED où commence U2 (mode Manuel)
    uint8_t  universeMode;         // 0=Manuel, 1=Continuation, 2=PixelAligned
};

// ─── Classe Config ────────────────────────────────────────────────────────────
class Config {
public:
    DeviceConfig data;

    void load();
    void save();
    void reset();
    void print();

    // Calcule automatiquement universe2LedStart selon le mode
    uint16_t calcUniverse2LedStart() const;

    // Calcule le skip en fin d'U1 (pour mode Resolume)
    uint8_t calcUniverse1Skip() const;

private:
    Preferences _prefs;
};