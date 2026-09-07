# DMX LED Controller

Système de contrôle de barres LED WS2812B via ESP32 et protocole Art-Net/sACN.

## Architecture

```
TouchDesigner / QLC+ / Resolume
         ↓ Art-Net (UDP broadcast port 6454)
    ESP32 (firmware)
         ↓ WS2812B
      Barres LED
         ↑ Découverte UDP port 4210
    Backend Node.js (Raspberry Pi, Mac/Windows en local, ou app desktop)
         ↑ WebSocket + API REST
    Frontend React (Dashboard)
```

Le flux Art-Net va **directement** du logiciel vers chaque ESP32 — le backend ne relaie pas la lumière, il gère uniquement la configuration et la découverte.

---

## Structure du projet

```
DMX_Led/
├── firmware/          # ESP32 — PlatformIO/Arduino
├── backend/           # Node.js — API REST, WebSocket, découverte UDP, proxy flash
├── frontend/          # React + Vite — Dashboard web
├── desktop/           # App Electron (Mac/Windows) — backend + dashboard packagés, sans Pi
│   └── README.md      # Dev & build de l'app desktop
├── pi/                # Scripts Raspberry Pi
│   ├── install.sh     # Installation complète
│   ├── update.sh      # Mise à jour
│   └── GUIDE.md       # Guide étape par étape
├── .github/workflows/ # GitHub Actions CI/CD
├── flash.py           # Script Python flash USB multiplateforme
├── flash_requirements.txt
├── README.md
├── HARDWARE.md
├── DEPLOYMENT.md
├── TOUCHDESIGNER.md
└── LICENSE.md
```

---

## Démarrage rapide

### Développement local (Mac)

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Dashboard : http://localhost:5173

### App Desktop (Mac/Windows, sans Raspberry Pi)

Pour configurer et piloter les ESP32 sans dépendre d'un Raspberry Pi allumé sur
le réseau, une app de bureau (Electron) embarque le backend et le dashboard
dans un seul exécutable double-cliquable (`.app` sur Mac, `.exe` sur Windows).

```bash
cd desktop
npm install
npm run dist:mac   # ou npm run dist:win
```

Voir [`desktop/README.md`](desktop/README.md) pour le détail (dev, build,
signature macOS, roadmap Android/iOS).

### Production (Raspberry Pi)

```bash
# Mise à jour complète
bash /opt/led-controller/pi/update.sh
```

Dashboard : http://[IP_PI]:3001

---

## Hardware testé

- **ESP32-S3-DevKitC-1** — board principal, 4 bandes LED
- **Raspberry Pi 4/5** — serveur central

### Boards alternatifs recommandés

| Board | Bandes | Prix | Note |
|---|---|---|---|
| ESP32-S3 Mini | 4 | ~5€ | Plus compact |
| XIAO ESP32-S3 | 4 | ~7€ | Le plus petit |
| ESP32-C3 Mini | 1 | ~3€ | Très économique |

---

## Firmware ESP32

### Flash depuis le dashboard (recommandé)

1. Branche l'ESP32 via le port **COM/UART** (pas USB natif)
2. Mets l'ESP32 en mode bootloader : maintiens **BOOT** → appuie **RESET** → relâche **BOOT**
3. Va sur l'onglet **⚡ Flash** dans le dashboard
4. Clique **Connect** → choisis **"USB Single Serial"**
5. Clique **"Install LED Controller"** → attends ~30s

### Flash depuis le terminal (PlatformIO)

```bash
export PATH="$HOME/Library/Python/3.9/bin:$PATH"
cd firmware
pio run --target upload
pio run --target uploadfs
pio device monitor --port /dev/cu.usbmodem5B141584811 --baud 115200
```

### Flash Python (multiplateforme)

```bash
pip3 install -r flash_requirements.txt
python3 flash.py
```

### Après le flash

1. Appuie sur **RESET** pour redémarrer l'ESP32
2. L'ESP32 crée un réseau Wi-Fi temporaire **LED-SETUP-[nom]**
3. Connecte-toi à ce réseau (mdp : `ledsetup123`)
4. Ouvre http://192.168.4.1 dans le navigateur
5. Va dans **Wi-Fi** → scanne et connecte-toi à ton réseau
6. L'ESP32 redémarre et rejoint le réseau → apparaît dans le dashboard

> Si l'ESP32 était déjà configuré, il rejoint automatiquement son réseau sans étapes supplémentaires.

---

## GitHub Actions CI/CD

À chaque push sur `main` :
- Compile le firmware ESP32-S3 avec PlatformIO
- Publie sur GitHub Releases : `firmware-esp32s3.bin`, `firmware-esp32s3-littlefs.bin`, `bootloader-esp32s3.bin`, `partitions-esp32s3.bin`, `manifest.json`

Le `manifest.json` est au format **ESP Web Tools** avec URLs absolues vers les binaires.

**App Desktop** (`.github/workflows/build-desktop.yml`) — sur push (`main`),
pull request touchant `desktop/`/`backend/`/`frontend/`, ou déclenchement
manuel : build l'app desktop sur runners macOS, Windows et Linux, publiée en
artefacts téléchargeables (onglet **Actions** du run) — pas de release
GitHub automatique (binaires non signés).

---

## Réseau LED-SHOW (Raspberry Pi)

Le Pi crée un réseau Wi-Fi autonome pour la tournée :

| Élément | Valeur |
|---|---|
| Réseau Wi-Fi | LED-SHOW |
| Mot de passe | ledcontroller2024 |
| IP du Pi | 192.168.10.1 |
| Dashboard | http://192.168.10.1:3001 |

### Options réseau

**Option A — Câble Ethernet disponible :**
```
Internet → Ethernet → Pi → Wi-Fi interne "LED-SHOW"
```

**Option B — Sans câble (clé Wi-Fi USB) :**
```
Internet → Wi-Fi lieu → clé USB Wi-Fi → Pi → Wi-Fi interne "LED-SHOW"
```

---

## Backlog

### 🔴 Bugs
- **Bug rainbow en mode DMX actif** — testMode expire après 3s, DMX reprend
- **PM2 ne redémarre pas après reboot Pi** — conflit root/user pi
- **Bug scan Wi-Fi ESP32** — parfois vide, nécessite plusieurs tentatives
- **Chrome bloque dashboard Pi** — Local Network Access policy (Safari fonctionne)

### 🟡 Flash ESP32
- **OTA / Mise à jour depuis le dashboard** — bouton par carte ESP32, comparaison version, option garder/écraser config (Wi-Fi, nom, bandes LED)

### 🟡 Application
- **Mise à jour serveur depuis l'interface web** — bouton dans le dashboard, logs en temps réel
- **Détection conflits de canaux** — avertissement si univers/canal déjà utilisé par une autre barre, avec nom de la barre en conflit
- **Renommer un ESP depuis le dashboard** — sans passer par l'interface locale
- **PWA / App mobile (Android/iOS)** — installable sur iPhone/Android ; app
  desktop (Mac/Windows) déjà disponible dans `desktop/`, voir
  [roadmap mobile](desktop/README.md#roadmap-mobile-android--ios)
- **Couleur/effet par défaut configurable** — par bande
- **Mode studio** — barres configurées sans ESP assigné
- **Internationalisation (i18n)** — support multi-langues sur toutes les pages

### 🟡 Infrastructure
- **Clé Wi-Fi USB** — Option B réseau LED-SHOW autonome (en attente livraison)
- **Configuration réseau** — depuis l'interface dashboard
- **Magic Setup** — détection automatique + config Wi-Fi zéro-clic

### 🟢 Documentation
- **Illustrations TouchDesigner** — captures d'écran réelles
- **Pages setup QLC+** — guide de configuration
- **Pages setup Resolume** — guide de configuration

### 🟢 Hardware
- **Support boards alternatifs** — ESP32-S3 Mini, XIAO ESP32-S3, ESP32-C3 Mini
- **Bonus ESP32-C3 OLED** — affichage IP, statut, QR code
