#!/bin/bash
# Dev server startup with file logging for AI agent access
# Usage: ./scripts/dev.sh

set -e

# Create logs directory
mkdir -p logs

# Clear previous logs
> logs/convex.log
> logs/nextjs.log

echo "Starting dev servers with file logging..."
echo "Logs will be written to:"
echo "  - logs/convex.log"
echo "  - logs/nextjs.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo "-----------------------------------"

# Start Convex in background with logging
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log &
CONVEX_PID=$!

# Give Convex a moment to start
sleep 2

# Start Next.js with logging
npm run dev 2>&1 | tee logs/nextjs.log &
NEXT_PID=$!

# Handle Ctrl+C to kill both processes
trap "echo ''; echo 'Stopping servers...'; kill $CONVEX_PID $NEXT_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for both processes
wait
