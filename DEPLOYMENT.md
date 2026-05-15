# Guide de déploiement

## Déploiement local (développement)

### Démarrer le backend
```bash
cd backend
npm run dev
```

### Démarrer le frontend
```bash
cd frontend
npm run dev
```

Accéder au dashboard : `http://localhost:5173`

---

## Flasher un ESP32 — première fois

### 1. Brancher l'ESP32 en USB

### 2. Vérifier le port disponible
```bash
pio device list
```
Tu verras quelque chose comme `/dev/cu.usbmodem1234` sur Mac.

### 3. Compiler et flasher
```bash
cd firmware
pio run --target upload        # firmware
pio run --target uploadfs      # interface web locale
```

### 4. Ouvrir le moniteur série
```bash
pio device monitor
```

### 5. Configuration initiale
- L'ESP32 démarre en mode AP : `LED-SETUP-barre-led-1`
- Connecter son téléphone/PC à ce réseau Wi-Fi
- Ouvrir `http://192.168.4.1`
- Configurer le Wi-Fi dans l'onglet "Wi-Fi"
- Après redémarrage, l'ESP32 apparaît dans le dashboard central

---

## Choisir la bonne branche

### Branche `main` — 1 bande par ESP32
```bash
git checkout main
cd firmware
pio run --target upload
pio run --target uploadfs
```

### Branche `feature/multi-strip` — jusqu'à 4 bandes par ESP32
```bash
git checkout feature/multi-strip
cd firmware
pio run --target upload
pio run --target uploadfs
```

La branche `feature/multi-strip` sera mergée dans `main` après validation sur hardware.

---

## Configurer plusieurs bandes (multi-strip)

Dans l'interface web locale de l'ESP32 (`http://IP_ESP32`) :

1. Aller dans "Bandes LED"
2. Activer les bandes nécessaires via le toggle
3. Pour chaque bande configurer :
   - Le GPIO (4, 5, 6 ou 7)
   - Le nombre de LEDs
   - L'univers DMX et le canal de départ
   - Le mode DMX
   - Le 2ème univers si plus de 170 LEDs en Full Pixel
4. Vérifier le résumé "Premier canal → Dernier canal" pour chaque bande
5. Enregistrer

Le schéma GPIO en bas de page montre visuellement quelles pins sont utilisées.

---

## Gestion multi-univers

Pour une bande de plus de 170 LEDs en mode Full Pixel :

### TouchDesigner (mode Manuel)
1. Dans TD, créer 2 segments dans le DMX Fixture POP
2. Segment 1 : Univers X, canal de départ Y, LEDs 1→170
3. Segment 2 : Univers X+1, canal 1, LEDs 171→300
4. Dans la config ESP32 : activer U2 = X+1, mode = Manuel, LED départ U2 = 171

### QLC+ (mode Continuation)
1. QLC+ découpe automatiquement
2. Dans la config ESP32 : activer U2, mode = Continuation
3. Le firmware recolle automatiquement les pixels coupés

### Resolume (mode Pixel aligné)
1. Resolume saute 1-2 canaux en fin d'univers 1
2. Dans la config ESP32 : activer U2, mode = Pixel aligné
3. Le firmware ignore les canaux vides automatiquement

---

## Déploiement sur Raspberry Pi (production)

### 1. Installer Node.js sur le Pi
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Cloner le projet
```bash
git clone https://github.com/gnouBXL/DMX_Led.git
cd DMX_Led
```

### 3. Installer les dépendances
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Builder le frontend
```bash
cd frontend
npm run build
```

### 5. Configurer l'URL de production
Modifier `frontend/.env` avant de builder :
```
VITE_API_URL=http://IP_DU_PI:3001
VITE_WS_URL=ws://IP_DU_PI:3001
```

### 6. Démarrage automatique avec PM2
```bash
sudo npm install -g pm2
cd /home/pi/DMX_Led
pm2 start backend/src/index.js --name "led-backend"
pm2 save
pm2 startup
```

### 7. Accéder au dashboard
```
http://IP_DU_PI:3001
```

---

## Mise à jour OTA (sans câble)

Depuis l'interface web locale de la barre (`http://IP_BARRE`) :
- Section "Système" → OTA Update (à implémenter)

Ou depuis le dashboard central :
- Cliquer sur la barre → bouton OTA

---

## Flasher plusieurs ESP32 en série

```bash
cd firmware

# ESP32 n°1
# Modifier DEFAULT_DEVICE_NAME dans src/config/Config.h → "barre-scene-1"
pio run --target upload
pio run --target uploadfs

# ESP32 n°2
# Modifier DEFAULT_DEVICE_NAME → "barre-scene-2"
pio run --target upload
pio run --target uploadfs

# Répéter pour chaque ESP32
```

---

## Checklist installation complète

- [ ] Raspberry Pi (ou PC) connecté au réseau
- [ ] Backend démarré (`pm2 status` ou `npm run dev`)
- [ ] Dashboard accessible depuis le navigateur
- [ ] ESP32 flashés avec le bon firmware (main ou multi-strip)
- [ ] ESP32 configurés sur le bon réseau Wi-Fi
- [ ] Barres visibles dans le dashboard
- [ ] GPIO câblés avec résistances 330Ω
- [ ] Alimentation 5V dimensionnée correctement
- [ ] Logiciel lumière configuré en Art-Net broadcast
- [ ] Univers DMX configurés sans conflit entre barres
- [ ] Mode univers correct selon le logiciel (Manuel/Continuation/Pixel aligné)
- [ ] Test couleur fonctionnel sur chaque bande
- [ ] Résumé premier/dernier canal vérifié et cohérent avec le patch lumière
