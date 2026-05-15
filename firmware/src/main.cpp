#include <Arduino.h>
#include <FastLED.h>
#include "config/Config.h"
#include "network/WiFiManager.h"
#include "network/ArtNet.h"
#include "leds/LedController.h"
#include "leds/Effects.h"
#include "web/WebServer.h"

// ─── Instances globales ───────────────────────────────────────────────────────
Config        config;
WiFiManager   wifiManager;
ArtNet        artnet;
LedController leds;
Effects       effects;
WebServer     webServer;

// ─── État du système ──────────────────────────────────────────────────────────
bool     dmxActive   = false;
uint32_t lastDmxTime = 0;

// ─── Callback Art-Net ─────────────────────────────────────────────────────────
// Appelé par ArtNet avec le buffer déjà fusionné (U1+U2 si multi-univers)
void onArtNetData(uint8_t* data, uint16_t length) {
    lastDmxTime = millis();

    if (!dmxActive) {
        Serial.println("[Main] Signal Art-Net reçu → mode DMX");
        dmxActive = true;
    }

    leds.applyDMX(data, length);
    leds.show();
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n=== LED Controller démarrage ===");

    // 1. Config
    config.load();
    config.print();

    // 2. LEDs
    leds.begin(config.data);

    // 3. Effets autonomes
    effects.begin(FastLED.leds(), config.data.ledCount);
    effects.setEffect(EFFECT_BREATHING);
    effects.setColor(0, 0, 50);  // bleu pendant connexion Wi-Fi

    // 4. Wi-Fi
    wifiManager.begin(config.data);

    // 5. Art-Net — écoute 1 ou 2 univers selon config
    artnet.begin(config.data, onArtNetData);

    // 6. Serveur web local
    webServer.begin(config, leds, effects, wifiManager);

    Serial.println("[Main] Démarrage terminé");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    // Wi-Fi
    wifiManager.loop();

    // Gestion timeout multi-univers (synchro U1+U2)
    artnet.loop();

    // Timeout signal DMX → mode autonome
    if (dmxActive) {
        if (millis() - lastDmxTime > config.data.timeoutMs) {
            Serial.println("[Main] Signal perdu → mode autonome");
            dmxActive = false;
            effects.setEffect(EFFECT_BREATHING);
            effects.setColor(50, 25, 0);  // orange en mode autonome
        }
    }

    // Effets autonomes si pas de DMX
    if (!dmxActive) {
        effects.loop();
        leds.show();
    }

    delay(1);
}