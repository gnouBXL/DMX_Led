#include <Arduino.h>
#include <FastLED.h>
#include "config/Config.h"
#include "network/WiFiManager.h"
#include "network/ArtNet.h"
#include "leds/LedController.h"
#include "leds/Effects.h"
#include "web/WebServer.h"
#include "network/Discovery.h"

// ─── Instances globales ───────────────────────────────────────────────────────
Config        config;
WiFiManager   wifiManager;
ArtNet        artnet;
LedController leds;
Effects       effects;
WebServer     webServer;
Discovery discovery;

// ─── État DMX par bande ───────────────────────────────────────────────────────
bool     dmxActive[MAX_STRIPS]   = { false };
uint32_t lastDmxTime[MAX_STRIPS] = { 0 };
bool     testMode[MAX_STRIPS]    = { false };
uint32_t testModeTime[MAX_STRIPS]= { 0 };
const uint32_t TEST_MODE_DURATION = 3000; // 3 secondes

// ─── Callback Art-Net ─────────────────────────────────────────────────────────
void onArtNetData(uint8_t stripIndex, uint8_t* data, uint16_t length) {
    if (stripIndex >= MAX_STRIPS) return;

    lastDmxTime[stripIndex] = millis();

    if (!dmxActive[stripIndex]) {
        Serial.printf("[Main] Signal Art-Net reçu → bande %d active\n", stripIndex + 1);
        dmxActive[stripIndex] = true;
    }

    if (!webServer.isTestMode(stripIndex)) {
        leds.getStrip(stripIndex).applyDMX(data, length);
    }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n=== LED Controller multi-bandes ===");

    // 1. Config
    config.load();
    config.print();

    // 2. LEDs
    leds.begin(config.data);

    // 3. Effets — passe les buffers de chaque bande active
    CRGB*    ledBuffers[MAX_STRIPS];
    uint16_t ledCounts[MAX_STRIPS];
    uint8_t  activeCount = 0;

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        if (!config.data.strips[i].enabled) continue;
        ledBuffers[activeCount] = leds.getStrip(i).leds;
        ledCounts[activeCount]  = leds.getStrip(i).ledCount;
        activeCount++;
    }

    effects.begin(ledBuffers, ledCounts, activeCount);

    // 4. Wi-Fi
    wifiManager.begin(config.data);
    discovery.begin(config.data);

    // 5. Art-Net
    artnet.begin(config.data, onArtNetData);

    // 6. Serveur web
    webServer.begin(config, leds, effects, wifiManager);

    Serial.println("[Main] Démarrage terminé");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    // Wi-Fi
    wifiManager.loop();

    // Discovery UDP
   discovery.loop();

    // Timeout synchro multi-univers
    artnet.loop();

    bool anyDmxActive = false;

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        if (!config.data.strips[i].enabled) continue;

        // Timeout signal DMX → mode autonome par bande
        if (dmxActive[i]) {
            if (millis() - lastDmxTime[i] > config.data.timeoutMs) {
                Serial.printf("[Main] Bande %d → mode autonome\n", i + 1);
                dmxActive[i] = false;
                effects.setEffect(i, EFFECT_BREATHING);
                effects.setColor(i, 50, 25, 0);  // orange
            } else {
                anyDmxActive = true;
            }
        }
    }

    // Effets autonomes sur les bandes sans signal DMX
    bool needShow = false;

    for (uint8_t i = 0; i < MAX_STRIPS; i++) {
        if (!config.data.strips[i].enabled) continue;

        if (dmxActive[i]) {
            if (millis() - lastDmxTime[i] > config.data.timeoutMs) {
                Serial.printf("[Main] Bande %d → mode autonome\n", i + 1);
                dmxActive[i] = false;
                effects.setEffect(i, EFFECT_BREATHING);
                effects.setColor(i, 50, 25, 0);
            } else {
                needShow = true;  // DMX actif → besoin de show
            }
        } else {
            effects.getStrip(i).loop();
            needShow = true;  // Effet autonome → besoin de show
        }

        // Mode test actif → forcer le show
        if (webServer.isTestMode(i)) {
            needShow = true;
        }
    }

    // Un seul show() par cycle
    if (needShow) {
        leds.show();
    }

    delay(1);
}