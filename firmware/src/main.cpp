#include <Arduino.h>
#include <FastLED.h>
#include "config/Config.h"
#include "network/WiFiManager.h"
#include "network/ArtNet.h"
#include "leds/LedController.h"
#include "leds/Effects.h"

// ─── Instances globales ───────────────────────────────────────────────────────
Config        config;
WiFiManager   wifiManager;
ArtNet        artnet;
LedController leds;
Effects       effects;

// ─── État du système ──────────────────────────────────────────────────────────
bool     dmxActive       = false;
uint32_t lastDmxTime     = 0;

// ─── Callback Art-Net ─────────────────────────────────────────────────────────
// Appelé automatiquement à chaque paquet Art-Net reçu
void onArtNetData(uint8_t* data, uint16_t length) {
    lastDmxTime = millis();

    // Si on était en mode autonome, on repasse en mode DMX
    if (!dmxActive) {
        Serial.println("[Main] Signal Art-Net reçu → mode DMX");
        dmxActive = true;
    }

    // Applique les données DMX aux LEDs
    leds.applyDMX(data, length);
    leds.show();
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n=== LED Controller démarrage ===");

    // 1. Charge la configuration depuis la flash
    config.load();
    config.print();

    // 2. Initialise les LEDs
    leds.begin(config.data);

    // 3. Initialise les effets (pointe vers le buffer FastLED)
    extern CRGB _ledsBuffer[];
    effects.begin(FastLED.leds(), config.data.ledCount);
    effects.setEffect(EFFECT_BREATHING);  // effet par défaut au démarrage
    effects.setColor(0, 0, 50);           // bleu doux pendant connexion Wi-Fi

    // 4. Démarre le Wi-Fi
    wifiManager.begin(config.data);

    // 5. Démarre la réception Art-Net
    artnet.begin(config.data, onArtNetData);

    Serial.println("[Main] Démarrage terminé");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    // Gestion Wi-Fi (reconnexion automatique)
    wifiManager.loop();

    // Vérifie si le signal DMX est perdu
    if (dmxActive) {
        uint32_t elapsed = millis() - lastDmxTime;
        if (elapsed > config.data.timeoutMs) {
            Serial.println("[Main] Signal Art-Net perdu → mode autonome");
            dmxActive = false;
            effects.setEffect(EFFECT_BREATHING);
            effects.setColor(50, 25, 0); // orange doux en mode autonome
        }
    }

    // Si pas de DMX actif → joue les effets autonomes
    if (!dmxActive) {
        effects.loop();
        leds.show();
    }

    // Petit délai pour éviter de saturer le CPU
    // Ne bloque pas la réception UDP (AsyncUDP tourne en interruption)
    delay(1);
}