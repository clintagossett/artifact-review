#!/bin/bash
# Usage: 
#   ./scripts/manage-agent.sh register [name] [port]
#   ./scripts/manage-agent.sh unregister [name]

COMMAND=$1
AGENT=$2
PORT=$3

PROXY_CONFIG="app/proxy-config.json"

if [ -z "$COMMAND" ] || [ -z "$AGENT" ]; then
    echo "Usage: $0 register <name> <port> | unregister <name>"
    exit 1
fi

# Ensure we are in project root
if [ ! -f "$PROXY_CONFIG" ]; then
    # try moving up
    if [ -f "../$PROXY_CONFIG" ]; then
        cd ..
    fi
fi

if [ ! -f "$PROXY_CONFIG" ]; then
    echo "Error: Could not find $PROXY_CONFIG. Run from project root."
    exit 1
fi

register_dns() {
    local domain="$1.loc"
    # List of all subdomains to ensure existence for
    local full_domains="$domain api.$domain novu.$domain novu-console.$domain mailpit.$domain convex.$domain"

    local missing=false
    for d in $full_domains; do
        if ! grep -q "$d" /etc/hosts; then
            missing=true
        fi
    done

    if [ "$missing" = true ]; then
        echo "⚠️  DNS: Subdomains missing for $domain. Asking for sudo to add them..."
        # Add all in one line
        echo "127.0.0.1 $full_domains" | sudo tee -a /etc/hosts
        echo "✅ DNS: domains added."
    else
        echo "✅ DNS: All domains exist for $domain"
    fi
}

update_config() {
    local action=$1
    local name=$2
    local appPort=$3
    
    # Use a temporary node script to edit the JSON safely
    node -e "
    const fs = require('fs');
    const path = '$PROXY_CONFIG';
    let config = {};
    try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch(e) {}
    
    if ('$action' === 'register') {
        const port = parseInt('$appPort');
        config['$name'] = {
            appPort: port,
            apiPort: port + 211,
            // Calculate Aux Ports (matching start-dev-servers.sh logic)
            novuPort: port + 1022,            // Studio (4032)
            novuConsolePort: port + 1200,     // Docker Web (4210)
            mailpitPort: port + 5025,
            convexDashboardPort: port + 3791
        };
        console.log('✅ Config: Registered ' + '$name');
    } else {
        delete config['$name'];
        console.log('✅ Config: Unregistered $name');
    }
    
    fs.writeFileSync(path, JSON.stringify(config, null, 2));
    "
}

if [ "$COMMAND" = "register" ]; then
    if [ -z "$PORT" ]; then
        echo "Error: Port required for registration."
        exit 1
    fi
    echo "🚀 Registering Agent: $AGENT"
    register_dns "$AGENT"
    update_config "register" "$AGENT" "$PORT"

elif [ "$COMMAND" = "unregister" ]; then
    echo "🗑️  Unregistering Agent: $AGENT"
    update_config "unregister" "$AGENT"
    echo "ℹ️  Note: DNS entries in /etc/hosts were NOT removed. This is harmless."

else
    echo "Unknown command: $COMMAND"
    exit 1
fi
