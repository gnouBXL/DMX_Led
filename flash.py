#!/usr/bin/env python3
"""
DMX LED Controller — Flash ESP32
Télécharge automatiquement le bon firmware depuis GitHub Releases et flashe l'ESP32.
"""

import sys
import os
import json
import urllib.request
import tempfile
import subprocess
import shutil
import requests

GITHUB_API = "https://api.github.com/repos/gnouBXL/DMX_Led/releases/latest"

CHIP_BOARD_MAP = {
    "ESP32-S3": "esp32-s3-devkitc-1",
    "ESP32-C3": "esp32-c3-devkitm-1",
    "ESP32-S2": "esp32-s2-devkitm-1",
    "ESP32":    "esp32-devkitc-1",
}

def log(msg, color=None):
    colors = {"green": "\033[92m", "red": "\033[91m", "yellow": "\033[93m", "blue": "\033[94m", "reset": "\033[0m"}
    if color and sys.platform != "win32":
        print(f"{colors.get(color,'')}{msg}{colors['reset']}")
    else:
        print(msg)

def check_esptool():
    if shutil.which("esptool.py") or shutil.which("esptool"):
        return shutil.which("esptool.py") or shutil.which("esptool")
    try:
        result = subprocess.run([sys.executable, "-m", "esptool", "--version"],
                      capture_output=True, check=True)
        return f"{sys.executable} -m esptool"
    except Exception as e:
        pass
    # Essai avec esptool.py depuis PlatformIO
    pio_path = os.path.expanduser("~/Library/Python/3.9/bin/esptool.py")
    if os.path.exists(pio_path):
        return pio_path
    log("❌ esptool non trouvé. Installez-le avec : pip install esptool", "red")
    sys.exit(1)

def get_serial_ports():
    try:
        import serial.tools.list_ports
        ports = list(serial.tools.list_ports.comports())
        esp_ports = [p for p in ports if any(vid in str(p.hwid).upper() for vid in ["303A", "10C4", "1A86", "0403"])]
        return esp_ports if esp_ports else ports
    except ImportError:
        log("⚠ pyserial non trouvé. Installez-le avec : pip install pyserial", "yellow")
        return []

def select_port(ports):
    if not ports:
        port = input("Entrez le port manuellement (ex: /dev/cu.usbmodem101 ou COM3) : ").strip()
        return port
    if len(ports) == 1:
        log(f"✓ ESP32 détecté sur {ports[0].device}", "green")
        return ports[0].device
    log("\nPorts disponibles :", "blue")
    for i, p in enumerate(ports):
        print(f"  {i+1}. {p.device} — {p.description}")
    while True:
        try:
            choice = int(input("\nChoisir le port (numéro) : ")) - 1
            if 0 <= choice < len(ports):
                return ports[choice].device
        except (ValueError, KeyboardInterrupt):
            pass

def detect_chip(esptool, port):
    log(f"\n🔍 Détection du chip sur {port}...", "blue")
    cmd = f"{esptool} --port {port} chip_id"
    try:
        result = subprocess.run(cmd.split(), capture_output=True, text=True, timeout=15)
        output = result.stdout + result.stderr
        for chip in ["ESP32-S3", "ESP32-C3", "ESP32-S2", "ESP32"]:
            if chip in output:
                log(f"✓ Chip détecté : {chip}", "green")
                return chip
        log("⚠ Chip non reconnu dans la sortie :", "yellow")
        print(output[:500])
        chip = input("Entrez le type manuellement (ESP32-S3 / ESP32-C3 / ESP32) : ").strip()
        return chip
    except subprocess.TimeoutExpired:
        log("❌ Timeout — vérifiez que l'ESP32 est bien branché et en mode normal", "red")
        sys.exit(1)

def get_github_token():
    env_file = os.path.join(os.path.dirname(__file__), '.flash_token')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            token = f.read().strip()
            if token:
                return token
    # Essai sans token d'abord
    try:
        req = urllib.request.Request(GITHUB_API)
        with urllib.request.urlopen(req, timeout=5) as r:
            return None  # repo public, pas besoin de token
    except urllib.error.HTTPError as e:
        if e.code == 404:
            log("\n🔒 Repo privé détecté — token GitHub requis", "yellow")
            log("   Créer un token sur : https://github.com/settings/tokens", "yellow")
            log("   Permissions requises : repo (read)", "yellow")
            token = input("\n   Coller le token GitHub : ").strip()
            with open(env_file, 'w') as f:
                f.write(token)
            log(f"✓ Token sauvegardé dans .flash_token", "green")
            return token
    return None

def fetch_manifest():
    log("\n📡 Récupération du manifest depuis GitHub Releases...", "blue")
    try:
        token = get_github_token()
        req = urllib.request.Request(GITHUB_API)
        if token:
            req.add_header("Authorization", f"token {token}")
        with urllib.request.urlopen(req, timeout=10) as r:
            release = json.loads(r.read())
        version = release.get("tag_name", "?")
        log(f"✓ Dernière release : {version}", "green")
        assets = {a["name"]: a["url"] for a in release.get("assets", [])}
        return token, assets, version
    except Exception as e:
        log(f"❌ Impossible de récupérer la release : {e}", "red")
        sys.exit(1)

def download_file(url, dest, label, token=None):
    log(f"⬇ Téléchargement {label}...", "blue")
    headers = {"Accept": "application/octet-stream"}
    if token:
        headers["Authorization"] = f"token {token}"
    
    response = requests.get(url, headers=headers, stream=True, allow_redirects=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('Content-Length', 0))
    block_size = 8192
    count = 0
    
    with open(dest, 'wb') as f:
        for chunk in response.iter_content(block_size):
            if chunk:
                f.write(chunk)
                count += 1
                if total_size > 0:
                    pct = min(int(count * block_size * 100 / total_size), 100)
                    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
                    print(f"\r  [{bar}] {pct}%", end="", flush=True)
    print()
    log(f"✓ {label} téléchargé", "green")

def flash(esptool, port, firmware_path, addr):
    log(f"\n⚡ Flashage sur {port}...", "blue")
    cmd = f"{esptool} --port {port} --baud 460800 write_flash {addr} {firmware_path}"
    result = subprocess.run(cmd.split(), timeout=120)
    if result.returncode != 0:
        log("❌ Erreur lors du flashage", "red")
        sys.exit(1)
    log("✓ Flashage réussi", "green")

def main():
    log("╔══════════════════════════════════════╗", "blue")
    log("║  DMX LED Controller — Flash ESP32    ║", "blue")
    log("╚══════════════════════════════════════╝", "blue")

    esptool = check_esptool()
    ports   = get_serial_ports()
    port    = select_port(ports)
    chip    = detect_chip(esptool, port)

    if chip not in CHIP_BOARD_MAP:
        log(f"❌ Chip '{chip}' non supporté", "red")
        sys.exit(1)

    board = CHIP_BOARD_MAP[chip]
    token, assets, version = fetch_manifest()

    # Lit le manifest.json depuis la release
    parts = None
    if "manifest.json" in assets:
        try:
            headers = {"Accept": "application/octet-stream"}
            if token:
                headers["Authorization"] = f"token {token}"
            r = requests.get(assets["manifest.json"], headers=headers, allow_redirects=True)
            manifest_data = r.json()
            for build in manifest_data.get("builds", []):
                if build.get("board") == board:
                    parts = build.get("parts", [])
                    break
        except Exception as e:
            log(f"⚠ Impossible de lire le manifest : {e}", "yellow")

    if not parts:
        log(f"⚠ Manifest sans parts pour {board} — abandon", "red")
        sys.exit(1)

    log(f"\n📦 Board : {board}", "blue")
    log(f"   Chip    : {chip}", "blue")
    log(f"   Version : {version}", "blue")
    log(f"   Parties : {len(parts)} fichiers à flasher", "blue")

    confirm = input("\nFlasher maintenant ? (o/n) : ").strip().lower()
    if confirm not in ["o", "y", "oui", "yes"]:
        log("Annulé.", "yellow")
        sys.exit(0)

    with tempfile.TemporaryDirectory() as tmpdir:
        for part in parts:
            fname  = part["path"]
            offset = part["offset"]
            if fname not in assets:
                log(f"⚠ {fname} non trouvé dans la release — ignoré", "yellow")
                continue
            dest = os.path.join(tmpdir, fname)
            download_file(assets[fname], dest, fname, token)
            flash(esptool, port, dest, offset)

    log("\n✅ ESP32 flashé avec succès !", "green")
    log(f"   Firmware : {version} ({chip})", "green")

if __name__ == "__main__":
    main()
