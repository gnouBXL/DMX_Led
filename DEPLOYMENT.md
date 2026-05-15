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

## Déploiement sur Raspberry Pi (production)

### Matériel recommandé
- Raspberry Pi 4 (2 Go RAM minimum)
- Carte SD 16 Go minimum (classe 10)
- Même réseau Wi-Fi que les ESP32

### 1. Installer Node.js sur le Pi

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # doit afficher v20.x.x
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

Cela crée le dossier `frontend/dist/` avec les fichiers statiques.

### 5. Configurer le backend pour servir le frontend

Modifier `backend/src/index.js` — ajouter après les routes API :

```javascript
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

// Sert le frontend buildé
app.use(express.static(join(__dirname, '../../frontend/dist')))
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../frontend/dist/index.html'))
})
```

### 6. Configurer l'URL de production

Modifier `frontend/.env` avant de builder :

```
VITE_API_URL=http://IP_DU_PI:3001
VITE_WS_URL=ws://IP_DU_PI:3001
```

Remplacer `IP_DU_PI` par l'IP fixe du Raspberry Pi.

### 7. Démarrage automatique avec PM2

```bash
sudo npm install -g pm2

# Démarrer le backend
cd /home/pi/DMX_Led
pm2 start backend/src/index.js --name "led-backend"

# Sauvegarder pour redémarrage automatique
pm2 save
pm2 startup
```

### 8. Accéder au dashboard

Ouvrir un navigateur sur n'importe quel appareil du réseau :
```
http://IP_DU_PI:3001
```

---

## Déploiement Docker (optionnel)

Créer `docker/docker-compose.yml` :

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ../backend
    ports:
      - "3001:3001"
    network_mode: host
    restart: unless-stopped
    volumes:
      - ../backend/config:/app/config

  frontend:
    build:
      context: ../frontend
    ports:
      - "80:80"
    restart: unless-stopped
    depends_on:
      - backend
```

> **Important** : `network_mode: host` est nécessaire pour que la découverte UDP fonctionne correctement.

Démarrer :
```bash
cd docker
docker-compose up -d
```

---

## Mise à jour du projet

```bash
git pull
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart led-backend
```

---

## Flasher un ESP32

### Première fois

```bash
cd firmware
pio run --target upload        # firmware
pio run --target uploadfs      # interface web locale
```

### Mise à jour OTA (sans câble)

Depuis le dashboard central, cliquer sur "OTA Update" sur la barre concernée, ou via l'interface web locale de la barre (`http://IP_BARRE/update`).

### Flasher plusieurs ESP32 en série

```bash
# Changer le nom dans firmware/src/config/Config.h
# DEFAULT_DEVICE_NAME "barre-led-2"
pio run --target upload
pio run --target uploadfs
# Répéter pour chaque barre
```

---

## Checklist installation complète

- [ ] Raspberry Pi connecté au réseau
- [ ] Backend démarré (`pm2 status`)
- [ ] Dashboard accessible depuis le navigateur
- [ ] ESP32 flashés avec le firmware
- [ ] ESP32 configurés sur le bon réseau Wi-Fi
- [ ] Barres visibles dans le dashboard
- [ ] Logiciel lumière configuré en Art-Net broadcast
- [ ] Test couleur fonctionnel sur chaque barre
- [ ] Univers DMX configurés sans conflit
