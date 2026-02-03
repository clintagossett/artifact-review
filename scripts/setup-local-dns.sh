#!/bin/bash

# 1. Add domains to /etc/hosts if missing
# 1. Add domains to /etc/hosts if missing
DOMAINS="ar.loc api.ar.loc"

# Add agent domains if requested
if [ -n "$1" ]; then
    AGENT="$1"
    echo "Adding domains for agent: $AGENT"
    DOMAINS="$DOMAINS $AGENT.loc api.$AGENT.loc"
fi

# Check if ALL domains exist
MISSING=false
for domain in $DOMAINS; do
    if ! grep -q "$domain" /etc/hosts; then
        MISSING=true
    fi
done

if [ "$MISSING" = true ]; then
    echo "Requesting sudo to update /etc/hosts with local domains..."
    # We construct the line carefully. 
    # NOTE: This simple approach appends a new line. 
    # Ideally we'd edit the existing line, but appending 127.0.0.1 ... works too.
    echo "127.0.0.1 $DOMAINS" | sudo tee -a /etc/hosts
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
