#!/bin/bash

# 1. Add domains to /etc/hosts if missing
if ! grep -q "ar.local.com" /etc/hosts; then
    echo "Requesting sudo to update /etc/hosts with local domains..."
    echo "127.0.0.1 ar.local.com api.ar.local.com" | sudo tee -a /etc/hosts
    echo "✅ /etc/hosts updated."
else
    echo "✅ Domains already present in /etc/hosts."
fi

NODE_PATH="/home/clint-gossett/.nvm/versions/node/v20.20.0/bin/node"

echo "Starting Proxy Server (using $NODE_PATH)..."
cd app
if sudo -n true 2>/dev/null; then
    sudo "$NODE_PATH" scripts/local-proxy.js
else
    echo "Please authorize sudo to bind to Port 80:"
    sudo "$NODE_PATH" scripts/local-proxy.js
fi
