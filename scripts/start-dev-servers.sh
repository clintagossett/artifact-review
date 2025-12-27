#!/bin/bash
# Dev server startup with port checking and graceful handling
# Run from project root: ./scripts/start-dev-servers.sh
#
# Usage:
#   ./scripts/start-dev-servers.sh           # Start servers (skip if already running)
#   ./scripts/start-dev-servers.sh --restart # Kill existing and restart fresh
#
# Features:
# - Checks if ports are already in use before starting
# - Skips starting a server if it's already running (unless --restart)
# - Only kills processes it started on Ctrl+C
# - Logs output to app/logs/ for AI agent access

# Don't exit on error - we handle errors gracefully
set +e

# Parse arguments
RESTART_MODE=false
for arg in "$@"; do
    case $arg in
        --restart|-r)
            RESTART_MODE=true
            shift
            ;;
    esac
done

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"

# Port configuration
NEXTJS_PORT=3000
CONVEX_PORT=8188

# Verify app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: app/ directory not found at $APP_DIR"
    exit 1
fi

# Change to app directory
cd "$APP_DIR"

# Create logs directory
mkdir -p logs

# Function to check if a port is in use
check_port() {
    local port=$1
    lsof -i :$port >/dev/null 2>&1
    return $?
}

# Function to get process using a port
get_port_process() {
    local port=$1
    lsof -i :$port -t 2>/dev/null | head -1
}

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(get_port_process $port)
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        sleep 1
        # Force kill if still running
        if check_port $port; then
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
        return 0
    fi
    return 1
}

echo "========================================"
echo "  Dev Server Startup"
if [ "$RESTART_MODE" = true ]; then
    echo "  Mode: RESTART (killing existing servers)"
else
    echo "  Mode: START (skip if running)"
fi
echo "========================================"
echo "  Working directory: $APP_DIR"
echo ""

# If restart mode, kill existing servers first
if [ "$RESTART_MODE" = true ]; then
    echo "Stopping existing servers..."

    if check_port $CONVEX_PORT; then
        EXISTING_PID=$(get_port_process $CONVEX_PORT)
        echo "  Killing Convex on port $CONVEX_PORT (PID: $EXISTING_PID)..."
        kill_port $CONVEX_PORT
        echo "  [OK] Convex stopped"
    else
        echo "  Convex not running"
    fi

    if check_port $NEXTJS_PORT; then
        EXISTING_PID=$(get_port_process $NEXTJS_PORT)
        echo "  Killing Next.js on port $NEXTJS_PORT (PID: $EXISTING_PID)..."
        kill_port $NEXTJS_PORT
        echo "  [OK] Next.js stopped"
    else
        echo "  Next.js not running"
    fi

    echo ""
fi

# Track which servers we start
CONVEX_PID=""
NEXT_PID=""
CONVEX_RUNNING=false
NEXTJS_RUNNING=false

# Check and start Convex
echo "Checking Convex (port $CONVEX_PORT)..."
if check_port $CONVEX_PORT; then
    EXISTING_PID=$(get_port_process $CONVEX_PORT)
    echo "  [SKIP] Convex already running on port $CONVEX_PORT (PID: $EXISTING_PID)"
    CONVEX_RUNNING=true
else
    echo "  [START] Starting Convex dev server..."
    > logs/convex.log
    npx convex dev --tail-logs always 2>&1 | tee logs/convex.log &
    CONVEX_PID=$!
    sleep 2
    if check_port $CONVEX_PORT; then
        echo "  [OK] Convex started successfully (PID: $CONVEX_PID)"
    else
        echo "  [WARN] Convex may still be starting..."
    fi
fi

echo ""

# Check and start Next.js
echo "Checking Next.js (port $NEXTJS_PORT)..."
if check_port $NEXTJS_PORT; then
    EXISTING_PID=$(get_port_process $NEXTJS_PORT)
    echo "  [SKIP] Next.js already running on port $NEXTJS_PORT (PID: $EXISTING_PID)"
    NEXTJS_RUNNING=true
else
    echo "  [START] Starting Next.js dev server..."
    > logs/nextjs.log
    npm run dev 2>&1 | tee logs/nextjs.log &
    NEXT_PID=$!
    sleep 2
    if check_port $NEXTJS_PORT; then
        echo "  [OK] Next.js started successfully (PID: $NEXT_PID)"
    else
        echo "  [WARN] Next.js may still be starting..."
    fi
fi

echo ""
echo "========================================"

# Summary
if [ "$CONVEX_RUNNING" = true ] && [ "$NEXTJS_RUNNING" = true ]; then
    echo "Both servers were already running."
    echo "Nothing to do - exiting."
    echo ""
    echo "Use --restart to force restart servers."
    exit 0
fi

echo "Logs:"
[ -n "$CONVEX_PID" ] && echo "  - app/logs/convex.log"
[ -n "$NEXT_PID" ] && echo "  - app/logs/nextjs.log"
echo ""
echo "Press Ctrl+C to stop started services"
echo "========================================"

# Handle Ctrl+C to kill only the processes we started
cleanup() {
    echo ""
    echo "Stopping servers..."
    [ -n "$CONVEX_PID" ] && kill $CONVEX_PID 2>/dev/null && echo "  Stopped Convex (PID: $CONVEX_PID)"
    [ -n "$NEXT_PID" ] && kill $NEXT_PID 2>/dev/null && echo "  Stopped Next.js (PID: $NEXT_PID)"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes we started
if [ -n "$CONVEX_PID" ] || [ -n "$NEXT_PID" ]; then
    wait
else
    echo "No servers started by this script."
fi
