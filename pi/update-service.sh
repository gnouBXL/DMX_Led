#!/bin/bash
# Script de mise à jour — lancé par l'API backend
INSTALL_DIR="/opt/led-controller"
SERVICE="led-controller"

cd "$INSTALL_DIR"
git pull --quiet

cd frontend
npm install --silent
npm run build --silent

cd ../backend
npm install --silent

systemctl restart "$SERVICE"
