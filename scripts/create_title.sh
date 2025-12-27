#!/bin/bash
# create_title.sh - Generate a title slide video using ffmpeg
#
# Usage: ./create_title.sh <title_text> <output_file> [duration] [width] [height]
# Example: ./create_title.sh "Login Flow" titles/01-login.mp4 3 1280 720

set -e

if [ $# -lt 2 ]; then
    echo "Usage: $0 <title_text> <output_file> [duration] [width] [height]"
    echo "Example: $0 'Login Flow' titles/01-login.mp4 3 1280 720"
    exit 1
fi

TITLE="$1"
OUTPUT="$2"
DURATION="${3:-3}"
WIDTH="${4:-1280}"
HEIGHT="${5:-720}"

# Colors
BG_COLOR="#1a1a2e"
TEXT_COLOR="white"
ACCENT_COLOR="#4a90d9"

# Create output directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT")"

# Detect OS for font path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    FONT_PATH="/System/Library/Fonts/Supplemental/Arial.ttf"
    if [ ! -f "$FONT_PATH" ]; then
        FONT_PATH="/System/Library/Fonts/Helvetica.ttc"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    FONT_PATH="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    if [ ! -f "$FONT_PATH" ]; then
        echo "Warning: DejaVu font not found. Install with: sudo apt install fonts-dejavu"
        FONT_PATH=""
    fi
else
    FONT_PATH=""
fi

# Build ffmpeg command
if [ -n "$FONT_PATH" ]; then
    FONT_ARG="fontfile=$FONT_PATH:"
else
    FONT_ARG=""
fi

echo "Generating title slide: $TITLE"

ffmpeg -y \
    -f lavfi -i "color=c=$BG_COLOR:s=${WIDTH}x${HEIGHT}:d=$DURATION" \
    -vf "drawtext=${FONT_ARG}text='$TITLE':fontsize=64:fontcolor=$TEXT_COLOR:x=(w-text_w)/2:y=(h-text_h)/2" \
    -c:v libx264 -t "$DURATION" -pix_fmt yuv420p \
    "$OUTPUT" 2>&1 | grep -v "^frame=" || true

echo "✓ Created title: $OUTPUT"
