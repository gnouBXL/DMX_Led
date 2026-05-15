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
#define DEFAULT_TIMEOUT_MS      5000   // délai avant mode autonome

#define LED_DATA_PIN            48     // GPIO48 sur ESP32-S3 DevKitC

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
};

// ─── Classe Config ────────────────────────────────────────────────────────────
class Config {
public:
    DeviceConfig data;

    void load();
    void save();
    void reset();
    void print();

private:
    Preferences _prefs;
};