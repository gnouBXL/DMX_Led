#!/bin/bash
# Script de mise à jour LED Controller sur le Pi
set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[✓]${NC} Mise à jour LED Controller..."

cd /opt/led-controller
sudo git pull

cd backend
sudo npm install -q

cd ../frontend
sudo npm install -q
sudo npm run build

sudo pm2 restart led-controller

echo -e "${GREEN}[✓]${NC} Mise à jour terminée !"
sudo pm2 status