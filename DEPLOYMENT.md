# Guide déploiement — Raspberry Pi LED Controller

## Option D : Pi crée le réseau LED-SHOW + pont internet via Ethernet

---

## Ce dont tu as besoin

- Raspberry Pi 4 ou 5
- Carte SD 32Go minimum
- Alimentation USB-C
- Câble Ethernet (pour connecter le Pi à ta box internet)
- Clé Wi-Fi USB (optionnelle — pour Option B sans câble)

---

## ÉTAPE 1 — Flasher la carte SD (sur le Mac)

1. Télécharge **Raspberry Pi Imager** : https://www.raspberrypi.com/software/
2. Lance Raspberry Pi Imager
3. Clique **"Choisir l'OS"** → **Raspberry Pi OS (64-bit)** Desktop
4. Clique **"Choisir le stockage"** → ta carte SD
5. Clique l'icône **⚙️** et configure :
   - ✅ **Activer SSH** → "Utiliser authentification par mot de passe"
   - **Nom d'utilisateur** : `pi`
   - **Mot de passe** : `ledcontroller2024`
   - ✅ **Configurer le Wi-Fi** → entre ton réseau actuel et son mot de passe
   - **Nom d'hôte** : `led-controller`
   - **Pays Wi-Fi** : `BE` (ou ton pays)
6. Clique **"Écrire"** et attends (~5 min)

---

## ÉTAPE 2 — Premier démarrage

1. Insère la carte SD dans le Pi
2. Branche le câble Ethernet entre le Pi et ta box internet
3. Branche la clé Wi-Fi USB dans un port USB du Pi (si disponible)
4. Branche l'alimentation USB-C
5. Attends 1-2 minutes

---

## ÉTAPE 3 — Connexion SSH depuis le Mac

```bash
ssh pi@led-controller.local
```

Mot de passe : `ledcontroller2024`

Si ça ne marche pas, trouve l'IP du Pi dans ton routeur :
```bash
ssh pi@[IP_DU_PI]
```

---

## ÉTAPE 4 — Installation automatique

```bash
curl -o install.sh https://raw.githubusercontent.com/gnouBXL/DMX_Led/main/pi/install.sh
chmod +x install.sh
sudo bash install.sh
```

L'installation prend ~10-15 minutes et configure automatiquement :
- Point d'accès Wi-Fi LED-SHOW
- Pont internet via Ethernet
- Node.js + backend LED Controller
- PM2 (démarrage automatique au boot)
- mDNS (accès via `led-controller.local`)

---

## ÉTAPE 5 — Redémarrer

```bash
sudo reboot
```

Attends 2 minutes.

---

## ÉTAPE 6 — Vérification

1. Cherche le réseau Wi-Fi **LED-SHOW** sur ton Mac
2. Connecte-toi avec le mot de passe : `ledcontroller2024`
3. Ouvre Safari : `http://192.168.10.1:3001`
4. Tu dois voir le dashboard LED Controller

---

## ÉTAPE 7 — Connecter les ESP32 au réseau LED-SHOW

Sur chaque ESP32 :
1. Va sur `http://[IP_ESP32]` (interface locale de l'ESP32)
2. Section **Wi-Fi** → Scan
3. Choisis **LED-SHOW**
4. Mot de passe : `ledcontroller2024`
5. Enregistrer → l'ESP32 redémarre et rejoint LED-SHOW

Les ESP32 apparaissent automatiquement dans le dashboard.

---

## Informations réseau

| Élément | Valeur |
|---|---|
| Réseau Wi-Fi | LED-SHOW |
| Mot de passe | ledcontroller2024 |
| IP du Pi | 192.168.10.1 |
| Dashboard | http://192.168.10.1:3001 |
| mDNS | http://led-controller.local:3001 |
| DHCP ESP32 | 192.168.10.10 → 192.168.10.50 |

> **Note Chrome :** Chrome bloque les connexions HTTP vers les IP locales (politique Local Network Access). Utilise **Safari** pour accéder au dashboard sur le Pi.

---

## Mise à jour

```bash
ssh pi@led-controller.local
bash /opt/led-controller/pi/update.sh
```

Le script met à jour le code, rebuild le frontend et redémarre le backend automatiquement.

---

## Commandes utiles (SSH)

```bash
# Voir les logs du backend
sudo pm2 logs led-controller

# Redémarrer le backend
sudo pm2 restart led-controller

# Statut du backend
sudo pm2 status

# Voir les appareils connectés au réseau LED-SHOW
arp -a

# Voir si le point d'accès est actif
sudo systemctl status hostapd
```

---

## En cas de problème

**Le réseau LED-SHOW n'apparaît pas :**
```bash
sudo systemctl restart hostapd
sudo systemctl status hostapd
```

**Le dashboard n'est pas accessible :**
```bash
sudo pm2 status
sudo pm2 logs led-controller --lines 50
```

**Pas d'internet sur LED-SHOW :**
```bash
sudo iptables -t nat -L
ip addr show eth0
```

**Le backend ne redémarre pas après reboot :**
```bash
# Problème connu — la sauvegarde PM2 est en root au lieu de pi
# Workaround temporaire :
sudo pm2 start /opt/led-controller/backend/src/index.js --name led-controller
sudo pm2 save
```
