#!/bin/bash
# ============================================================
# LED Controller — Script d'installation Raspberry Pi
# Option D : Pi crée le réseau LED-SHOW + pont vers internet
# Compatible Raspberry Pi 4 et 5
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[⚠]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section(){ echo -e "\n${BLUE}══════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════${NC}"; }

# ── Vérifications ────────────────────────────────────────────
section "Vérifications"

if [ "$EUID" -ne 0 ]; then
  error "Ce script doit être lancé en root : sudo bash install.sh"
fi

PI_MODEL=$(cat /proc/device-tree/model 2>/dev/null || echo "Unknown")
log "Modèle détecté : $PI_MODEL"

# ── Variables configurables ──────────────────────────────────
WIFI_SSID="LED-SHOW"
WIFI_PASS="ledcontroller2024"
WIFI_CHANNEL=6
WIFI_IP="192.168.10.1"
DHCP_START="192.168.10.10"
DHCP_END="192.168.10.50"
NODE_VERSION="20"
APP_DIR="/opt/led-controller"
APP_USER="pi"

# Interface Wi-Fi AP (clé USB ou interne)
# wlan0 = Wi-Fi interne du Pi
# wlan1 = Clé Wi-Fi USB (pour pont)
AP_IFACE="wlan1"       # Clé USB Wi-Fi qui crée LED-SHOW
ETH_IFACE="wlan0"      # Wi-Fi interne connecté à internet

section "Mise à jour du système"
apt-get update -qq
apt-get upgrade -y -qq
log "Système mis à jour"

section "Installation des dépendances"
apt-get install -y -qq \
    hostapd \
    dnsmasq \
    iptables \
    iptables-persistent \
    curl \
    git \
    avahi-daemon \
    build-essential
log "Dépendances installées"

section "Installation de Node.js $NODE_VERSION"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    log "Node.js $(node --version) installé"
else
    log "Node.js déjà installé : $(node --version)"
fi

section "Installation de PM2 (gestionnaire de processus)"
npm install -g pm2 -q
log "PM2 installé"

section "Configuration du point d'accès Wi-Fi LED-SHOW"

# Arrêt des services
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Configuration hostapd
cat > /etc/hostapd/hostapd.conf << EOF
interface=$AP_IFACE
driver=nl80211
ssid=$WIFI_SSID
hw_mode=g
channel=$WIFI_CHANNEL
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=$WIFI_PASS
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF

echo 'DAEMON_CONF="/etc/hostapd/hostapd.conf"' > /etc/default/hostapd
log "hostapd configuré (réseau : $WIFI_SSID / mdp : $WIFI_PASS)"

# Configuration IP statique pour l'interface AP
cat >> /etc/dhcpcd.conf << EOF

# LED-SHOW Access Point
interface $AP_IFACE
    static ip_address=$WIFI_IP/24
    nohook wpa_supplicant
EOF
log "IP statique configurée : $WIFI_IP"

# Configuration dnsmasq (DHCP + DNS)
mv /etc/dnsmasq.conf /etc/dnsmasq.conf.bak 2>/dev/null || true
cat > /etc/dnsmasq.conf << EOF
interface=$AP_IFACE
dhcp-range=$DHCP_START,$DHCP_END,255.255.255.0,24h
domain=local
address=/led-controller.local/$WIFI_IP
EOF
log "dnsmasq configuré (DHCP : $DHCP_START - $DHCP_END)"

section "Configuration du pont réseau (internet via Ethernet)"

# Activation du routage IP
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p /etc/sysctl.conf -q

# Règles iptables pour le NAT
# Masquerade sur wlan0 (Wi-Fi internet) ET eth0 (Ethernet internet)
iptables -t nat -A POSTROUTING -o $ETH_IFACE -j MASQUERADE
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i $ETH_IFACE -o $AP_IFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i $AP_IFACE -o $ETH_IFACE -j ACCEPT
iptables -A FORWARD -i eth0 -o $AP_IFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i $AP_IFACE -o eth0 -j ACCEPT

# Sauvegarde des règles iptables
netfilter-persistent save
log "Pont réseau configuré (internet via $ETH_IFACE)"

section "Démarrage automatique des services"
systemctl unmask hostapd
systemctl enable hostapd
systemctl enable dnsmasq
systemctl enable avahi-daemon
log "Services activés au démarrage"

section "Clonage du projet LED Controller"
if [ -d "$APP_DIR" ]; then
    warn "Dossier $APP_DIR existe déjà — mise à jour"
    cd $APP_DIR && git pull
else
    git clone https://github.com/gnouBXL/DMX_Led.git $APP_DIR
    log "Projet cloné dans $APP_DIR"
fi

section "Build du frontend React"
cd $APP_DIR/frontend
npm install -q
npm run build
log "Frontend buildé"

section "Installation des dépendances Node.js"
cd $APP_DIR/backend
npm install -q
log "Dépendances backend installées"

section "Configuration NetworkManager — ignorer wlan1 et IP statique"
cat > /etc/NetworkManager/conf.d/unmanaged.conf << EOF
[keyfile]
unmanaged-devices=interface-name:$AP_IFACE
EOF

# Service systemd pour configurer wlan1 au boot
cat > /etc/systemd/system/led-show-ap.service << EOF
[Unit]
Description=LED-SHOW Access Point Setup
After=network.target hostapd.service
Wants=hostapd.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash -c 'ip addr add $WIFI_IP/24 dev $AP_IFACE 2>/dev/null || true && systemctl restart hostapd && systemctl restart dnsmasq'

[Install]
WantedBy=multi-user.target
EOF

systemctl enable led-show-ap.service
log "Service led-show-ap configuré pour démarrer au boot"

section "Configuration PM2 — démarrage automatique du backend"
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'led-controller',
    script: 'src/index.js',
    cwd: '$APP_DIR/backend',
    interpreter: 'node',
    interpreter_args: '--experimental-vm-modules',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false,
  }]
}
EOF

cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER | tail -1 | bash
log "Backend LED Controller configuré avec PM2"

section "Configuration mDNS (accès via led-controller.local)"
cat > /etc/avahi/services/led-controller.service << EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>LED Controller</name>
  <service>
    <type>_http._tcp</type>
    <port>3001</port>
  </service>
</service-group>
EOF
systemctl restart avahi-daemon
log "mDNS configuré — accessible via http://led-controller.local:3001"

section "Installation terminée !"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  LED Controller installé sur le Pi !         ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Réseau Wi-Fi : $WIFI_SSID                    ║${NC}"
echo -e "${GREEN}║  Mot de passe : $WIFI_PASS          ║${NC}"
echo -e "${GREEN}║  IP du Pi     : $WIFI_IP                ║${NC}"
echo -e "${GREEN}║  Dashboard    : http://$WIFI_IP:3001    ║${NC}"
echo -e "${GREEN}║  ou           : http://led-controller.local:3001 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
warn "Redémarre le Pi pour activer tous les services :"
echo "  sudo reboot"
