#!/bin/bash
# LED Controller — Installation simplifiée pour Raspberry Pi
# Le Pi se connecte au routeur existant (pas de mode AP)
# Dashboard accessible sur http://<IP-du-Pi>:3001
set -e

REPO_URL="https://github.com/gnouBXL/DMX_Led.git"
INSTALL_DIR="/opt/led-controller"
SERVICE="led-controller"
NODE_VERSION="20"
PI_USER="${SUDO_USER:-pi}"

if [ "$EUID" -ne 0 ]; then
    echo "Lance ce script avec sudo : sudo bash install-simple.sh"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   LED Controller — Installation Pi       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Dépendances système ─────────────────────────────────────────────────
echo "[1/7] Mise à jour et dépendances..."
apt-get update -qq
apt-get install -y -qq git curl avahi-daemon

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────
if ! node --version 2>/dev/null | grep -q "^v${NODE_VERSION}"; then
    echo "[2/7] Installation Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
else
    echo "[2/7] Node.js $(node --version) déjà installé"
fi

# ── 3. Clone ou mise à jour du repo ───────────────────────────────────────
echo "[3/7] Récupération du code..."
if [ -d "$INSTALL_DIR/.git" ]; then
    git -C "$INSTALL_DIR" pull --quiet
else
    git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi
chown -R "$PI_USER:$PI_USER" "$INSTALL_DIR"

# ── 4. Build frontend ──────────────────────────────────────────────────────
echo "[4/7] Build du frontend..."
cd "$INSTALL_DIR/frontend"
sudo -u "$PI_USER" npm install --silent
sudo -u "$PI_USER" npm run build --silent

# ── 5. Dépendances backend ────────────────────────────────────────────────
echo "[5/7] Dépendances backend..."
cd "$INSTALL_DIR/backend"
sudo -u "$PI_USER" npm install --silent

# ── 6. Service systemd ────────────────────────────────────────────────────
echo "[6/7] Configuration du service systemd..."
cat > /etc/systemd/system/${SERVICE}.service << EOF
[Unit]
Description=LED Controller Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${PI_USER}
WorkingDirectory=${INSTALL_DIR}/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
Environment=PORT=3001
Environment=INSTALL_DIR=${INSTALL_DIR}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE" --quiet
systemctl restart "$SERVICE"

# ── 7. mDNS ───────────────────────────────────────────────────────────────
echo "[7/7] Configuration mDNS..."
mkdir -p /etc/avahi/services
cat > /etc/avahi/services/led-controller.service << EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">LED Controller</name>
  <service>
    <type>_http._tcp</type>
    <port>3001</port>
  </service>
</service-group>
EOF
systemctl restart avahi-daemon

# ── WiFi (optionnel) ──────────────────────────────────────────────────────
echo ""
read -p "Configurer le WiFi ? [o/N] " WIFI
if [[ "$WIFI" =~ ^[Oo]$ ]]; then
    read -p "SSID du routeur : " WIFI_SSID
    read -sp "Mot de passe : " WIFI_PASS
    echo ""
    if command -v nmcli &>/dev/null; then
        nmcli dev wifi connect "$WIFI_SSID" password "$WIFI_PASS" 2>/dev/null || true
    else
        wpa_passphrase "$WIFI_SSID" "$WIFI_PASS" >> /etc/wpa_supplicant/wpa_supplicant.conf
        wpa_cli -i wlan0 reconfigure 2>/dev/null || true
    fi
    echo "WiFi configuré : $WIFI_SSID"
fi

# ── IP statique (optionnel) ────────────────────────────────────────────────
echo ""
read -p "Configurer une IP statique ? (recommandé) [o/N] " STATIC
if [[ "$STATIC" =~ ^[Oo]$ ]]; then
    read -p "Interface (eth0 ou wlan0) [eth0] : " IFACE
    IFACE=${IFACE:-eth0}
    read -p "IP souhaitée [192.168.1.10] : " STATIC_IP
    STATIC_IP=${STATIC_IP:-192.168.1.10}
    read -p "IP du routeur [192.168.1.1] : " GW
    GW=${GW:-192.168.1.1}

    # Évite les doublons
    grep -q "interface ${IFACE}" /etc/dhcpcd.conf && \
        sed -i "/interface ${IFACE}/,/^$/d" /etc/dhcpcd.conf

    cat >> /etc/dhcpcd.conf << EOF

interface ${IFACE}
static ip_address=${STATIC_IP}/24
static routers=${GW}
static domain_name_servers=8.8.8.8
EOF
    echo "IP statique configurée : ${STATIC_IP}"
fi

# ── Résumé ─────────────────────────────────────────────────────────────────
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Installation terminée ✓                ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Dashboard :                             ║"
echo "║  http://${LOCAL_IP}:3001"
echo "║  http://led-controller.local:3001        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Pour voir les logs : journalctl -u led-controller -f"
