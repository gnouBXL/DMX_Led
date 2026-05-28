#!/bin/bash
# Script de mise à jour LED Controller sur le Pi
# Lance : bash update.sh

set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[✓]${NC} Mise à jour LED Controller..."

cd /opt/led-controller
git pull

cd backend
npm install -q

pm2 restart led-controller

echo -e "${GREEN}[✓]${NC} Mise à jour terminée !"
pm2 status
