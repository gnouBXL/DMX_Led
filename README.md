# DMX LED Controller

Système de contrôle de barres LED WS2812B via ESP32, Art-Net et sACN sur Wi-Fi.

## Architecture

```
Logiciel lumière (TouchDesigner / QLC+ / Resolume / grandMA)
        ↓  Art-Net / sACN — UDP broadcast direct
   Réseau Wi-Fi
        ↓  chaque ESP32 reçoit et filtre ses univers
   ESP32 + WS2812B (1 à 4 bandes par ESP32)
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

## Branches

| Branche | Description |
|---|---|
| `main` | Version stable — 1 bande LED par ESP32 |
| `feature/multi-strip` | Version avancée — jusqu'à 4 bandes par ESP32 |

## Matériel recommandé

| Composant | Modèle recommandé |
|---|---|
| Microcontrôleur | ESP32-S3-DevKitC-1 |
| LEDs | WS2812B 5V, 60 LED/m |
| Alimentation | 5V / 10A minimum pour 300 LEDs |
| Résistance data | 330Ω sur chaque ligne DATA |
| Condensateur | 1000µF 6.3V entre +5V et GND |

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

## Capacité du système

| Configuration | Bandes | LEDs max/barre | Canaux DMX max |
|---|---|---|---|
| 1 bande / ESP32 (main) | 1 | 300 | 900 (2 univers) |
| Multi-bandes / ESP32 (feature) | 4 | 300 | 900 par bande |
| Système complet | 50 ESP32 | 300 | illimité |

## Configuration DMX

Chaque bande est configurée avec :

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
| Univers 2 | 2ème univers pour bandes > 170 LEDs en Full Pixel |
| Mode univers | Manuel / Continuation / Pixel aligné |

### Modes DMX

**Full Pixel** — 1 LED = 3 canaux (R, G, B)
```
100 LEDs → 300 canaux DMX
300 LEDs → 900 canaux DMX (2 univers nécessaires)
```

**Grouped** — N LEDs = 3 canaux (R, G, B)
```
100 LEDs, groupe 5 → 20 pixels → 60 canaux DMX
```

**Full Bar** — toute la barre = 3 canaux (R, G, B)
```
N LEDs → 3 canaux DMX
```

## Gestion multi-univers

Une bande de 300 LEDs en Full Pixel nécessite 900 canaux DMX. Un univers ne contenant que 512 canaux, il faut 2 univers. Chaque logiciel gère ce découpage différemment :

| Mode | Logiciel | Comportement |
|---|---|---|
| Manuel | TouchDesigner | Tu définis toi-même la LED de départ dans U2 |
| Continuation | QLC+, grandMA | Canaux continus, une LED peut être coupée entre U1 et U2 |
| Pixel aligné | Resolume | Skip 1-2 canaux en fin U1, pixels jamais coupés |

Le firmware gère automatiquement les trois modes et recolle les données correctement.

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

Si aucun flux Art-Net/sACN n'est reçu pendant le délai configuré (défaut : 5 secondes), chaque bande bascule automatiquement en mode autonome avec des effets locaux. Le retour du signal DMX relance automatiquement le contrôle réseau.

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
| GET | `/api/config` | Configuration complète |
| POST | `/api/config` | Modifier la configuration |
| POST | `/api/wifi` | Configurer le Wi-Fi |
| POST | `/api/test` | Test LED (color / rainbow / off) |
| POST | `/api/effect` | Activer un effet autonome |
| POST | `/api/reboot` | Redémarrer l'ESP32 |

## Compatibilité logiciels lumière

- TouchDesigner (DMX Fixture POP)
- QLC+
- Resolume Arena / Avenue
- grandMA2 / grandMA3
- Tout logiciel compatible Art-Net ou sACN

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
- Si bande > 170 LEDs en Full Pixel : vérifier la config multi-univers

**Couleurs décalées autour du point de coupure entre univers**
- Vérifier que le mode univers correspond à ton logiciel (Manuel/Continuation/Pixel aligné)
- TouchDesigner : mode Manuel, configurer la LED de départ dans U2
- QLC+ : mode Continuation
- Resolume : mode Pixel aligné

**L'ESP32 redémarre en boucle**
- Problème d'alimentation : vérifier que le 5V est suffisant
- Vérifier les logs avant le redémarrage dans le moniteur série

**Compilation échoue**
- Vérifier PlatformIO : `pio --version`
- Nettoyer et recompiler : `pio run --target clean && pio run`

## Licence

MIT — libre d'utilisation, modification et distribution.