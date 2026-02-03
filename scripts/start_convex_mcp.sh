#!/bin/bash
# Add common user binary paths and explicit node path to PATH
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin:/Users/clintgossett/.nvm/versions/node/v22.21.1/bin

# Resolve the absolute path of the script directory to be safe
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../app"

# Navigate to the app directory
cd "$APP_DIR"

# verify we are in the right place
if [ ! -f "package.json" ]; then
    echo "Error: Could not find package.json in $APP_DIR" >&2
    exit 1
fi

# Start the MCP server
exec npx convex mcp start
