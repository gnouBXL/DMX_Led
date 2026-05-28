# Guide d'installation — Raspberry Pi LED Controller
## Option D : Pi crée le réseau LED-SHOW + pont internet via Ethernet

---

## Ce dont tu as besoin

- Raspberry Pi 4 ou 5
- Carte SD 32Go (minimum)
- Alimentation USB-C
- Câble Ethernet (pour connecter le Pi à ta box internet)
- Clé Wi-Fi USB (arrivée demain) — pour créer le réseau LED-SHOW
- Mac pour l'installation

---

## ÉTAPE 1 — Flasher la carte SD (sur le Mac)

1. Télécharge **Raspberry Pi Imager** : https://www.raspberrypi.com/software/
2. Lance Raspberry Pi Imager
3. Clique **"Choisir l'OS"** → **Raspberry Pi OS (64-bit)** (version Desktop)
4. Clique **"Choisir le stockage"** → ta carte SD
5. Clique l'icône ⚙️ (paramètres avancés) et configure :
   - ✅ **Activer SSH** → "Utiliser authentification par mot de passe"
   - **Nom d'utilisateur** : `pi`
   - **Mot de passe** : `ledcontroller2024` (ou ce que tu veux)
   - ✅ **Configurer le Wi-Fi** → entre ton réseau Wi-Fi actuel (VOO-DAUBGH4) et son mot de passe
   - **Nom d'hôte** : `led-controller`
6. Clique **"Écrire"** et attends (~5 min)

---

## ÉTAPE 2 — Premier démarrage du Pi

1. Insère la carte SD dans le Pi
2. Branche le câble Ethernet entre le Pi et ta box internet
3. Branche la clé Wi-Fi USB dans un port USB du Pi
4. Branche l'alimentation USB-C
5. Attends 1-2 minutes que le Pi démarre

---

## ÉTAPE 3 — Connexion SSH depuis le Mac

Ouvre un terminal sur le Mac et tape :

```bash
ssh pi@led-controller.local
```

Si ça ne marche pas, trouve l'IP du Pi dans ton routeur et tape :
```bash
ssh pi@[IP_DU_PI]
```

Tape le mot de passe que tu as configuré à l'étape 1.

---

## ÉTAPE 4 — Lancer le script d'installation

Une fois connecté en SSH, tape ces commandes une par une :

```bash
# Télécharger le script d'installation
curl -o install.sh https://raw.githubusercontent.com/gnouBXL/DMX_Led/main/pi/install.sh

# Rendre le script exécutable
chmod +x install.sh

# Lancer l'installation (prend ~10-15 minutes)
sudo bash install.sh
```

L'installation est automatique — tu verras les étapes défiler.

---

## ÉTAPE 5 — Redémarrer le Pi

À la fin de l'installation :

```bash
sudo reboot
```

Attends 1-2 minutes.

---

## ÉTAPE 6 — Vérification

1. Sur ton Mac, cherche le réseau Wi-Fi **LED-SHOW**
2. Connecte-toi avec le mot de passe : `ledcontroller2024`
3. Ouvre Chrome et va sur : `http://192.168.10.1:3001`
4. Tu dois voir le dashboard LED Controller !

Tu as également internet car le Pi fait le pont via Ethernet.

---

## ÉTAPE 7 — Connecter les ESP32 au réseau LED-SHOW

Sur chaque ESP32 :
1. Va sur `http://[IP_ESP32]` (interface locale)
2. Section Wi-Fi → Scan
3. Choisis **LED-SHOW**
4. Entre le mot de passe : `ledcontroller2024`
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
| Accès mDNS | http://led-controller.local:3001 |
| DHCP ESP32 | 192.168.10.10 → 192.168.10.50 |

---

## Commandes utiles (SSH)

```bash
# Voir les logs du backend
pm2 logs led-controller

# Redémarrer le backend
pm2 restart led-controller

# Statut du backend
pm2 status

# Voir les appareils connectés au réseau LED-SHOW
arp -a

# Voir si le point d'accès est actif
systemctl status hostapd

# Mettre à jour le firmware LED Controller
cd /opt/led-controller && git pull && pm2 restart led-controller
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
pm2 status
pm2 restart led-controller
pm2 logs led-controller --lines 50
```

**Pas d'internet sur LED-SHOW :**
```bash
sudo iptables -t nat -L
# Vérifier que eth0 est bien connecté
ip addr show eth0
```
