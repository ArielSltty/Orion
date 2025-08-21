#!/bin/bash

# Hentikan skrip jika ada perintah yang gagal
set -e

echo "INFO: Starting local replica in the background..."
dfx start --background --clean

echo "INFO: Deploying Orion_backend canister..."
dfx deploy Orion_backend

echo "INFO: Starting Python agent..."

# Pindah ke direktori agen
cd src/Orion_agent

# Aktifkan virtual environment
source venv/bin/activate

# Jalankan agen Python di foreground
# Tekan CTRL+C untuk menghentikan agen ini nanti
python agent.py
