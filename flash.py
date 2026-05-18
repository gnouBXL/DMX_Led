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

CHIP_FIRMWARE_MAP = {
    "ESP32-S3": "firmware-esp32s3.bin",
    "ESP32-C3": "firmware-esp32c3.bin",
    "ESP32-S2": "firmware-esp32s2.bin",
    "ESP32":    "firmware-esp32.bin",
}

CHIP_LITTLEFS_MAP = {
    "ESP32-S3": "firmware-esp32s3-littlefs.bin",
    "ESP32-C3": "firmware-esp32c3-littlefs.bin",
    "ESP32-S2": "firmware-esp32s2-littlefs.bin",
    "ESP32":    "firmware-esp32-littlefs.bin",
}

CHIP_FLASH_ADDR = {
    "ESP32-S3": {"firmware": "0x0",    "littlefs": "0x670000"},
    "ESP32-C3": {"firmware": "0x0",    "littlefs": "0x670000"},
    "ESP32-S2": {"firmware": "0x1000", "littlefs": "0x670000"},
    "ESP32":    {"firmware": "0x1000", "littlefs": "0x670000"},
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
        return version, assets
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

    if chip not in CHIP_FIRMWARE_MAP:
        log(f"❌ Chip '{chip}' non supporté", "red")
        sys.exit(1)

    version, assets = fetch_manifest()

    fw_name  = CHIP_FIRMWARE_MAP[chip]
    lfs_name = CHIP_LITTLEFS_MAP[chip]
    addrs    = CHIP_FLASH_ADDR[chip]

    if fw_name not in assets:
        log(f"❌ Firmware '{fw_name}' non trouvé dans la release {version}", "red")
        log(f"   Fichiers disponibles : {list(assets.keys())}", "yellow")
        sys.exit(1)

    log(f"\n📦 Firmware sélectionné : {fw_name}", "blue")
    log(f"   Chip    : {chip}", "blue")
    log(f"   Version : {version}", "blue")

    confirm = input("\nFlasher maintenant ? (o/n) : ").strip().lower()
    if confirm not in ["o", "y", "oui", "yes"]:
        log("Annulé.", "yellow")
        sys.exit(0)

    with tempfile.TemporaryDirectory() as tmpdir:
        fw_path  = os.path.join(tmpdir, fw_name)
        lfs_path = os.path.join(tmpdir, lfs_name)

        token = get_github_token()
        log(f"URL: {assets[fw_name]}", "yellow")
        download_file(assets[fw_name], fw_path, fw_name, token)
        flash(esptool, port, fw_path, addrs["firmware"])

        if lfs_name in assets:
            download_file(assets[lfs_name], lfs_path, lfs_name, token)
            flash(esptool, port, lfs_path, addrs["littlefs"])
        else:
            log(f"⚠ Filesystem '{lfs_name}' non trouvé dans la release — ignoré", "yellow")

    log("\n✅ ESP32 flashé avec succès !", "green")
    log(f"   Firmware : {version} ({chip})", "green")

if __name__ == "__main__":
    main()
