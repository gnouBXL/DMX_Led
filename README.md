# DMX LED Controller

Système de contrôle de barres LED WS2812B via ESP32, Art-Net et sACN sur Wi-Fi.

## Architecture

```
Logiciel lumière (TouchDesigner / QLC+ / Resolume / grandMA)
        ↓  Art-Net / sACN — UDP broadcast direct
   Réseau Wi-Fi
        ↓  chaque ESP32 reçoit et filtre son univers
   ESP32 + WS2812B
```

Le serveur central **ne relaie pas** le flux lumière. Il sert uniquement à configurer les barres et visualiser leur état.

## Structure du projet

```
DMX_Led/
├── firmware/          # Code ESP32 (PlatformIO / Arduino)
├── backend/           # Serveur Node.js (découverte, API, WebSocket)
├── frontend/          # Dashboard React (Vite)
└── docker/            # Déploiement Docker (optionnel)
```

## Matériel recommandé

| Composant | Modèle recommandé |
|---|---|
| Microcontrôleur | ESP32-S3-DevKitC-1 |
| LEDs | WS2812B 5V, 60 LED/m |
| Alimentation | 5V / 10A minimum pour 300 LEDs |
| Câble data | Résistance 300-500Ω sur DATA |

## Prérequis logiciels

- Node.js 20 LTS
- Python 3.9+
- PlatformIO Core (`pip3 install platformio`)
- Git

## Installation rapide

### 1. Cloner le repo

```bash
git clone https://github.com/gnouBXL/DMX_Led.git
cd DMX_Led
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

Le backend démarre sur `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Le dashboard démarre sur `http://localhost:5173`

### 4. Firmware ESP32

```bash
cd firmware
pio run                          # compiler
pio run --target upload          # flasher le firmware
pio run --target uploadfs        # flasher l'interface web locale
pio device monitor               # voir les logs série
```

## Configuration DMX

Chaque barre est configurée avec :

| Paramètre | Description |
|---|---|
| Univers DMX | Numéro d'univers Art-Net (0–32767) |
| Canal de départ | Premier canal DMX utilisé (1–512) |
| Nombre de LEDs | 1 à 300 |
| Mode DMX | Full Pixel / Grouped / Full Bar |
| Taille groupe | LEDs par groupe (mode Grouped) |
| Luminosité | 0–255 |
| FPS max | Fréquence de rafraîchissement maximum |
| Timeout | Délai avant mode autonome (ms) |

### Modes DMX

**Full Pixel** — 1 LED = 3 canaux (R, G, B)
```
100 LEDs → 300 canaux DMX
```

**Grouped** — N LEDs = 3 canaux (R, G, B)
```
100 LEDs, groupe 5 → 20 pixels → 60 canaux DMX
```

**Full Bar** — toute la barre = 3 canaux (R, G, B)
```
N LEDs → 3 canaux DMX
```

## Protocoles réseau

| Protocole | Port | Usage |
|---|---|---|
| Art-Net | UDP 6454 | Flux DMX temps réel |
| sACN / E1.31 | UDP 5568 | Flux DMX temps réel (alternatif) |
| HTTP | TCP 80 | Interface web locale ESP32 |
| mDNS | — | Découverte `nom-barre.local` |
| UDP Discovery | UDP 4210 | Annonce ESP32 → backend |
| WebSocket | TCP 3001 | Dashboard ↔ backend temps réel |

## Mode autonome

Si aucun flux Art-Net/sACN n'est reçu pendant le délai configuré (défaut : 5 secondes), l'ESP32 bascule automatiquement en mode autonome avec des effets locaux. Le retour du signal DMX relance automatiquement le contrôle réseau.

## API REST backend

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/bars` | Liste toutes les barres détectées |
| GET | `/api/bars/:ip/config` | Lit la config d'une barre |
| POST | `/api/bars/:ip/config` | Modifie la config d'une barre |
| POST | `/api/bars/:ip/test` | Test couleur ou effet |
| POST | `/api/bars/:ip/reboot` | Redémarre une barre |
| GET | `/api/ping` | Sanity check |

## API REST ESP32 locale

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/status` | État de la barre (IP, RSSI, uptime…) |
| GET | `/api/config` | Configuration DMX |
| POST | `/api/config` | Modifier la configuration |
| POST | `/api/wifi` | Configurer le Wi-Fi |
| POST | `/api/test` | Test LED (color / rainbow / off) |
| POST | `/api/effect` | Activer un effet autonome |
| POST | `/api/reboot` | Redémarrer l'ESP32 |

## Effets autonomes disponibles

| ID | Nom | Description |
|---|---|---|
| 0 | None | Aucun effet |
| 1 | Solid | Couleur fixe |
| 2 | Fade | Fondu entrée/sortie |
| 3 | Breathing | Respiration douce |
| 4 | Rainbow | Arc-en-ciel lent |
| 5 | Chase | Pixel courant |
| 6 | Strobe | Flash rapide |

## Compatibilité logiciels lumière

- TouchDesigner
- QLC+
- Resolume Arena / Avenue
- grandMA2 / grandMA3
- Tout logiciel compatible Art-Net ou sACN

## Flasher un nouvel ESP32

1. Brancher l'ESP32 en USB
2. Vérifier le port : `pio device list`
3. Compiler et flasher :

```bash
cd firmware
pio run --target upload
pio run --target uploadfs
```

4. Ouvrir le moniteur série :

```bash
pio device monitor
```

5. L'ESP32 démarre en mode AP `LED-SETUP-barre-led-1`
6. Connecter son téléphone/PC au réseau `LED-SETUP-barre-led-1`
7. Ouvrir `http://192.168.4.1` pour configurer le Wi-Fi
8. Après redémarrage, l'ESP32 apparaît dans le dashboard

## Variables d'environnement frontend

Créer `frontend/.env` :

```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Pour un déploiement sur Raspberry Pi, remplacer `localhost` par l'IP du Pi.

## Dépannage

**La barre n'apparaît pas dans le dashboard**
- Vérifier que backend et ESP32 sont sur le même réseau Wi-Fi
- Vérifier les logs série : `pio device monitor`
- Vérifier que le port UDP 4210 n'est pas bloqué

**Les LEDs ne répondent pas à l'Art-Net**
- Vérifier l'univers DMX configuré sur la barre
- Vérifier que le logiciel lumière envoie en broadcast ou vers l'IP de la barre
- Vérifier le canal de départ

**L'ESP32 redémarre en boucle**
- Problème d'alimentation : vérifier que le 5V est suffisant
- Vérifier les logs avant le redémarrage dans le moniteur série

**Compilation échoue**
- Vérifier PlatformIO : `pio --version`
- Nettoyer et recompiler : `pio run --target clean && pio run`

## Licence

MIT — libre d'utilisation, modification et distribution.
