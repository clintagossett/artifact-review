#!/bin/bash
# Dev server startup with port checking and graceful handling
# Run from project root: ./scripts/start-dev-servers.sh
#
# Usage:
#   ./scripts/start-dev-servers.sh                    # Start servers (skip if already running)
#   ./scripts/start-dev-servers.sh --restart|--force  # Kill existing and restart fresh
#
# Features:
# - Checks if ports are already in use before starting
# - Skips starting a server if it's already running (unless --restart/--force)
# - Only kills processes it started on Ctrl+C
# - Logs output to app/logs/ for AI agent access

# Don't exit on error - we handle errors gracefully
set +e

# Parse arguments
# Parse arguments
RESTART_MODE=false
NOVU_LOCAL_MODE=false
for arg in "$@"; do
    case $arg in
        --restart|-r|--force|-f)
            RESTART_MODE=true
            ;;
        --novu-local)
            NOVU_LOCAL_MODE=true
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
NOVU_PORT=2022

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

    if check_port $NOVU_PORT; then
        EXISTING_PID=$(get_port_process $NOVU_PORT)
        echo "  Killing Novu on port $NOVU_PORT (PID: $EXISTING_PID)..."
        kill_port $NOVU_PORT
        echo "  [OK] Novu stopped"
    else
        echo "  Novu not running"
    fi

    echo ""
fi

# Track which servers we start
CONVEX_PID=""
NEXT_PID=""
NOVU_PID=""
CONVEX_RUNNING=false
NEXTJS_RUNNING=false

# Check and start Docker App (Desktop)
echo "Checking Docker Desktop..."
if ! pgrep -x "Docker" > /dev/null; then
    echo "  [START] Docker Desktop is not running. Starting..."
    open -a Docker
    while ! docker info > /dev/null 2>&1; do
        echo "  [WAIT] Waiting for Docker to initialize..."
        sleep 5
    done
    echo "  [OK] Docker Desktop is ready"
else
    echo "  [SKIP] Docker Desktop is already running"
fi

# Check and start Docker services (Convex, Mailpit)
echo "Checking Docker services (Convex, Mailpit)..."
if [ "$NOVU_LOCAL_MODE" = true ]; then
    echo "  [INFO] Novu Local Mode ENABLED (Loading docker-compose.novu.yml)"
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.novu.yml"
else
    COMPOSE_FILES="-f docker-compose.yml"
fi

# Change to project root for compose if needed, or use relative paths
# NOTE: The script is running from APP_DIR ($PROJECT_ROOT/app).
# The compose files are in PROJECT_ROOT.
# We need to be careful about context.
# Best approach: Run compose from PROJECT_ROOT context.

pushd "$PROJECT_ROOT" > /dev/null

if ! docker compose $COMPOSE_FILES ps | grep -q "Up"; then
    echo "  [START] Starting Docker services..."
    docker compose $COMPOSE_FILES up -d
else
    # If using novu-local, ensure those specific services are up
    if [ "$NOVU_LOCAL_MODE" = true ]; then
        if ! docker compose $COMPOSE_FILES ps | grep -q "novu-api"; then
            echo "  [START] Starting additional Novu services..."
             docker compose $COMPOSE_FILES up -d
        else
            echo "  [SKIP] Docker services already running"
        fi
    else
        echo "  [SKIP] Docker services already running"
    fi
fi

popd > /dev/null

# Set up local Convex functions
echo "Initializing local Convex functions..."
npx convex dev --once || { echo "ERROR: Failed to push to local Convex"; exit 1; }

# Start Stripe Tunnel (NEW)
echo "Checking Stripe CLI tunnel..."
if ! pgrep -x "stripe" > /dev/null; then
    echo "  [START] Starting Stripe CLI tunnel..."
    # We need to get the site URL for the webhook
    CONVEX_SITE_URL=$(npx convex env get CONVEX_SITE_URL 2>/dev/null || echo "")
    if [ -z "$CONVEX_SITE_URL" ]; then
        # Fallback: site URLs usually follow a pattern or we can extract from 'convex dev'
        echo "  [INFO] Getting Convex Site URL..."
        CONVEX_SITE_URL=$(npx convex dev --once | grep "site URL:" | awk '{print $NF}')
    fi

    if [ -n "$CONVEX_SITE_URL" ]; then
        echo "  [OK] Forwarding to: $CONVEX_SITE_URL/stripe/webhook"
        > logs/stripe.log
        stripe listen --forward-to "$CONVEX_SITE_URL/stripe/webhook" 2>&1 | tee logs/stripe.log &
        STRIPE_PID=$!
        echo "  [HINT] Check logs/stripe.log for the 'whsec_...' key if it's new"
    else
        echo "  [ERROR] Could not determine CONVEX_SITE_URL. Skipping Stripe tunnel."
    fi
else
    echo "  [SKIP] Stripe CLI tunnel already active"
fi

# Start Convex watching in background
echo "Starting Convex function watcher..."
> logs/convex.log
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log &
CONVEX_PID=$!
CONVEX_RUNNING=true

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

# Check and start Novu Studio (port 2022)
echo "Checking Novu Studio (port $NOVU_PORT)..."
if check_port $NOVU_PORT; then
    EXISTING_PID=$(get_port_process $NOVU_PORT)
    echo "  [SKIP] Novu Studio already running on port $NOVU_PORT (PID: $EXISTING_PID)"
else
    echo "  [START] Starting Novu Studio..."
    > logs/novu.log
    # npx prompt handling: echo "y" | ...
    echo "y" | npx novu@latest dev -p $NEXTJS_PORT 2>&1 | tee logs/novu.log &
    NOVU_PID=$!
    echo "  [OK] Novu Studio started (PID: $NOVU_PID)"
fi

echo ""
echo "========================================"

# Summary
if [ "$CONVEX_RUNNING" = true ] && [ "$NEXTJS_RUNNING" = true ]; then
    echo "Both servers were already running."
    echo "Nothing to do - exiting."
    echo ""
    echo "Use --restart or --force to force restart servers."
    exit 0
fi

echo "Logs:"
[ -n "$CONVEX_PID" ] && echo "  - app/logs/convex.log"
[ -n "$NEXT_PID" ] && echo "  - app/logs/nextjs.log"
[ -n "$NOVU_PID" ] && echo "  - app/logs/novu.log"
echo ""
echo "Press Ctrl+C to stop started services"
echo "========================================"

# Handle Ctrl+C to kill only the processes we started
cleanup() {
    echo ""
    echo "Stopping servers..."
    [ -n "$CONVEX_PID" ] && kill $CONVEX_PID 2>/dev/null && echo "  Stopped Convex (PID: $CONVEX_PID)"
    [ -n "$NEXT_PID" ] && kill $NEXT_PID 2>/dev/null && echo "  Stopped Next.js (PID: $NEXT_PID)"
    [ -n "$NOVU_PID" ] && kill $NOVU_PID 2>/dev/null && echo "  Stopped Novu (PID: $NOVU_PID)"
    [ -n "$STRIPE_PID" ] && kill $STRIPE_PID 2>/dev/null && echo "  Stopped Stripe CLI (PID: $STRIPE_PID)"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes we started
if [ -n "$CONVEX_PID" ] || [ -n "$NEXT_PID" ]; then
    wait
else
    echo "No servers started by this script."
fi
