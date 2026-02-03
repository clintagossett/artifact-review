#!/usr/bin/env bash
#
# Example Usage: Config Parser Library
#
# This script demonstrates how to use scripts/lib/parse-config.sh
#

set -euo pipefail

# Source the library
source scripts/lib/parse-config.sh

echo "============================================================================"
echo "Config Parser Library - Example Usage"
echo "============================================================================"
echo ""

# Example 1: Get specific port for an agent
echo "Example 1: Get appPort for 'james' agent"
echo "-------------------------------------------"
APP_PORT=$(get_agent_port "james" "appPort")
echo "APP_PORT=$APP_PORT"
echo ""

# Example 2: Get multiple ports
echo "Example 2: Get multiple ports for 'james' agent"
echo "-------------------------------------------"
CONVEX_CLOUD_PORT=$(get_agent_port "james" "convexCloudPort")
CONVEX_SITE_PORT=$(get_agent_port "james" "convexSitePort")
SUBNET=$(get_agent_port "james" "subnet")

echo "CONVEX_CLOUD_PORT=$CONVEX_CLOUD_PORT"
echo "CONVEX_SITE_PORT=$CONVEX_SITE_PORT"
echo "SUBNET=$SUBNET"
echo ""

# Example 3: Get full agent config as JSON
echo "Example 3: Get full config for 'james' agent"
echo "-------------------------------------------"
CONFIG=$(get_agent_config "james")
echo "$CONFIG" | jq '.'
echo ""

# Example 4: Validate agent exists
echo "Example 4: Validate agent exists"
echo "-------------------------------------------"
if validate_agent_exists "james"; then
    echo "✓ Agent 'james' exists"
else
    echo "✗ Agent 'james' does not exist"
fi

if validate_agent_exists "nonexistent"; then
    echo "✓ Agent 'nonexistent' exists"
else
    echo "✗ Agent 'nonexistent' does not exist"
fi
echo ""

# Example 5: Error handling
echo "Example 5: Error handling"
echo "-------------------------------------------"
echo "Attempting to get port for non-existent agent..."
set +e
OUTPUT=$(get_agent_port "nonexistent" "appPort" 2>&1)
EXIT_CODE=$?
set -e

echo "Exit code: $EXIT_CODE"
echo "Output: $OUTPUT"
echo ""

# Example 6: Using in a script to generate env file
echo "Example 6: Generate environment variables"
echo "-------------------------------------------"
cat << EOF
# Auto-generated environment variables for agent: james
AGENT_NAME=james
APP_PORT=$(get_agent_port "james" "appPort")
CONVEX_CLOUD_PORT=$(get_agent_port "james" "convexCloudPort")
CONVEX_SITE_PORT=$(get_agent_port "james" "convexSitePort")
MAILPIT_PORT=$(get_agent_port "james" "mailpitPort")
CONVEX_DASHBOARD_PORT=$(get_agent_port "james" "convexDashboardPort")
SUBNET=$(get_agent_port "james" "subnet")
EOF
echo ""

echo "============================================================================"
echo "All examples completed successfully!"
echo "============================================================================"
