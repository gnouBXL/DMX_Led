# Hardware — LED Controller

## ESP32 recommandés

### Principal — ESP32-S3-DevKitC-1
- **4 bandes LED** WS2812B (GPIO 4, 5, 6, 7)
- **300 LEDs max** par bande
- Testé et validé
- Firmware stable v2.0.0
- ~8-12€

### Alternatives

| Board | Bandes | Prix | Dimensions | Note |
|---|---|---|---|---|
| ESP32-S3 Mini | 4 | ~5€ | Petit | Même capacité, plus compact |
| XIAO ESP32-S3 (Seeed) | 4 | ~7€ | 21×17mm | Le plus petit avec 4 canaux |
| ESP32-C3 Mini | 1 | ~3€ | 18×20mm | 1 seule bande, très économique |

### Bonus (non prioritaire)
- **ESP32-C3 avec écran OLED 0.42"** — affiche IP, statut, QR code. ~5€.

---

## Câblage

```
ESP32 GPIO 4  → Data bande 1
ESP32 GPIO 5  → Data bande 2
ESP32 GPIO 6  → Data bande 3
ESP32 GPIO 7  → Data bande 4
ESP32 GND     → GND alimentation + GND bandes LED
5V externe    → VCC bandes LED (NE PAS alimenter depuis l'ESP32)
```

> ⚠️ **Important** : Toujours alimenter les bandes LED depuis une alimentation 5V externe, jamais depuis l'ESP32. Pour 300 LEDs à pleine puissance, prévoir ~18A (300 LEDs × 60mA).

---

## Serveur — Raspberry Pi

| Modèle | RAM | Note |
|---|---|---|
| Pi 4 (2Go) | 2Go | Minimum recommandé |
| Pi 4 (4Go) | 4Go | Recommandé |
| Pi 5 | 4-8Go | Meilleur pour router le réseau |

---

## Ports USB de l'ESP32-S3

L'ESP32-S3-DevKitC-1 a **2 ports USB** :

| Port | Nom | Usage |
|---|---|---|
| USB-C (côté composants) | USB natif | Flash via ESP Web Tools, debug |
| Micro-USB | UART/COM | Flash PlatformIO, monitoring série |

Pour flasher depuis le dashboard, utilise le port **UART** (Micro-USB) et la procédure BOOT+RESET.
