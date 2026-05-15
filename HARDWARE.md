# Guide matériel

## Liste du matériel pour 1 ESP32 avec 1 bande

| Composant | Quantité | Prix estimé |
|---|---|---|
| ESP32-S3-DevKitC-1 | 1 | 8–10€ |
| Strip WS2812B 5V 60LED/m | 1m | 5–8€ |
| Alimentation 5V 10A | 1 | 10–15€ |
| Résistance 330Ω | 1 | <1€ |
| Condensateur 1000µF 6.3V | 1 | <1€ |
| Câble JST 3 pins | 1 | <1€ |
| Boîtier plastique | 1 | 2–5€ |

**Total estimé : 25–40€ par barre**

## Liste du matériel pour 1 ESP32 avec 4 bandes (multi-strip)

| Composant | Quantité | Prix estimé |
|---|---|---|
| ESP32-S3-DevKitC-1 | 1 | 8–10€ |
| Strip WS2812B 5V 60LED/m | 4m | 20–32€ |
| Alimentation 5V 40A | 1 | 30–40€ |
| Résistance 330Ω | 4 | <1€ |
| Condensateur 1000µF 6.3V | 4 | 2€ |
| Câble JST 3 pins | 4 | 3€ |
| Boîtier plastique | 1 | 2–5€ |

**Total estimé : 65–95€ pour 4 bandes sur 1 ESP32**

---

## GPIO disponibles — ESP32-S3-DevKitC-1

### Pins recommandées pour les bandes LED (RMT)

| Bande | GPIO | Position sur la carte |
|---|---|---|
| Bande 1 | GPIO 4 | Côté gauche, 4ème pin en partant du haut |
| Bande 2 | GPIO 5 | Côté gauche, 5ème pin |
| Bande 3 | GPIO 6 | Côté gauche, 6ème pin |
| Bande 4 | GPIO 7 | Côté gauche, 7ème pin |

Ces 4 GPIO utilisent les canaux RMT 0-3 de l'ESP32-S3 — le périphérique hardware dédié au protocole WS2812B. C'est la limite hardware : 4 bandes maximum par ESP32-S3.

### GPIO à éviter absolument

| GPIO | Raison |
|---|---|
| GPIO 0 | Pin de boot — perturbe le démarrage |
| GPIO 19, 20 | USB natif de l'ESP32-S3 |
| GPIO 26 | Flash SPI interne |
| GPIO 43, 44 | UART (logs série) |
| GPIO 45, 46 | Strapping pins |

---

## Schéma de câblage — 1 bande

```
ESP32-S3                    WS2812B Strip
---------                   ------------
GPIO 4   ---[330Ω]-------→  DATA
GND      ─────────────────→  GND (commun avec alim)

Alimentation 5V externe
+5V ──────────────────────→  +5V (strip)
GND ──────────────────────→  GND (strip + ESP32)

[1000µF entre +5V et GND, près du premier pixel]
```

## Schéma de câblage — 4 bandes sur 1 ESP32

```
ESP32-S3
---------
GPIO 4  ---[330Ω]---→  DATA Bande 1
GPIO 5  ---[330Ω]---→  DATA Bande 2
GPIO 6  ---[330Ω]---→  DATA Bande 3
GPIO 7  ---[330Ω]---→  DATA Bande 4
GND     ────────────→  GND commun

Alimentation 5V (suffisamment dimensionnée)
+5V ────→  +5V Bande 1  [1000µF]
+5V ────→  +5V Bande 2  [1000µF]
+5V ────→  +5V Bande 3  [1000µF]
+5V ────→  +5V Bande 4  [1000µF]
GND ────→  GND toutes bandes + GND ESP32
```

---

## Points importants

**Résistance sur DATA**
Toujours mettre une résistance 330–500Ω entre le GPIO et le premier pixel WS2812B. Elle protège contre les réflexions de signal. Une par bande.

**Condensateur sur l'alimentation**
Un condensateur 1000µF entre +5V et GND près du premier pixel de chaque bande absorbe les pics de courant au démarrage.

**Ne pas alimenter les LEDs via l'ESP32**
L'ESP32 ne peut pas fournir le courant nécessaire. Toujours utiliser une alimentation 5V dédiée. Relier les GND ensemble.

**Calcul de l'alimentation**
Chaque LED WS2812B consomme au maximum 60mA (blanc plein).

```
1 bande × 300 LEDs × 60mA  =  18A maximum
4 bandes × 300 LEDs × 60mA =  72A maximum

En pratique avec luminosité 50% :
1 bande × 300 LEDs × 20mA  =   6A
4 bandes × 300 LEDs × 20mA =  24A
```

Prévoir une marge de 20% sur l'alimentation. Pour 4 bandes de 300 LEDs, une alimentation 5V 30A est recommandée en usage normal.

---

## Recommandations réseau

**Pour une installation professionnelle**
- Utiliser un point d'accès Wi-Fi dédié (pas le box internet)
- Fréquence 2.4 GHz (meilleure portée que 5 GHz)
- Router supportant 50+ clients simultanés
- Désactiver l'économie d'énergie Wi-Fi sur l'AP

**Routeurs recommandés**
- Ubiquiti UniFi AP
- TP-Link EAP series
- MikroTik (configuration avancée)

---

## Boîtier recommandé

Pour une installation scénique :
- Boîtier plastique IP65 minimum
- Prévoir ventilation si température > 40°C
- Fixer l'alimentation séparément (poids et chaleur)
- Étiqueter chaque ESP32 avec son nom, son IP et la liste de ses bandes
