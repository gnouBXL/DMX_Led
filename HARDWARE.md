# Guide matériel

## Liste du matériel pour 1 barre

| Composant | Quantité | Prix estimé |
|---|---|---|
| ESP32-S3-DevKitC-1 | 1 | 8–10€ |
| Strip WS2812B 5V 60LED/m | 1m | 5–8€ |
| Alimentation 5V 10A | 1 | 10–15€ |
| Résistance 330Ω | 1 | <1€ |
| Condensateur 1000µF 6.3V | 1 | <1€ |
| Câble JST 3 pins | 1 | <1€ |
| Boîtier plastique | 1 | 2–5€ |

**Total estimé par barre : 25–40€**

## Schéma de câblage

```
ESP32-S3                    WS2812B Strip
---------                   ------------
GPIO 48  ---[330Ω]-------→  DATA
GND      ─────────────────→  GND
                             
Alimentation 5V externe
+5V ──────────────────────→  +5V (strip)
GND ──────────────────────→  GND (strip)
GND ──────────────────────→  GND (ESP32)

[1000µF entre +5V et GND, près du premier pixel]
```

## Points importants

**Résistance sur DATA**
Toujours mettre une résistance 300–500Ω entre le GPIO et le premier pixel WS2812B. Elle protège contre les réflexions de signal.

**Condensateur sur l'alimentation**
Un condensateur 1000µF entre +5V et GND près du premier pixel absorbe les pics de courant au démarrage.

**Ne pas alimenter les LEDs via l'ESP32**
L'ESP32 ne peut pas fournir le courant nécessaire. Toujours utiliser une alimentation 5V dédiée pour les LEDs. Relier les GND ensemble.

**Calcul de l'alimentation**
Chaque LED WS2812B consomme au maximum 60mA (blanc plein).

```
100 LEDs × 60mA = 6A maximum
300 LEDs × 60mA = 18A maximum
```

En pratique avec une luminosité de 50% :
```
100 LEDs × 20mA = 2A
300 LEDs × 20mA = 6A
```

Prévoir une marge de 20% sur l'alimentation.

## GPIO disponibles sur ESP32-S3-DevKitC-1

| GPIO | Usage dans ce projet |
|---|---|
| GPIO 48 | DATA WS2812B (configurable dans Config.h) |
| GPIO 1–18 | Disponibles |
| GPIO 19–20 | USB (ne pas utiliser) |
| GPIO 43–44 | UART (logs série) |

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

## Boîtier recommandé

Pour une installation scénique :
- Boîtier plastique IP65 minimum
- Prévoir ventilation si température > 40°C
- Fixer l'alimentation séparément (poids)
- Étiqueter chaque barre avec son nom et son IP
