#!/bin/bash
# normalize_video.sh - Convert video to normalized MP4 format
#
# Normalizes to consistent resolution, fps, codec for concatenation
# Usage: ./normalize_video.sh <input_file> [output_file] [width] [height] [fps]
# Example: ./normalize_video.sh test-results/login-flow/flow.webm

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file> [output_file] [width] [height] [fps]"
    echo "Example: $0 test-results/login-flow/flow.webm"
    exit 1
fi

INPUT="$1"
OUTPUT="${2:-${INPUT%.webm}_normalized.mp4}"
WIDTH="${3:-1280}"
HEIGHT="${4:-720}"
FPS="${5:-30}"

# Check if input exists
if [ ! -f "$INPUT" ]; then
    echo "Error: Input file $INPUT does not exist"
    exit 1
fi

echo "Normalizing video: $(basename "$INPUT")"

ffmpeg -y \
    -i "$INPUT" \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2" \
    -r "$FPS" \
    -pix_fmt yuv420p \
    -an \
    "$OUTPUT" 2>&1 | grep -v "^frame=" || true

echo "✓ Normalized: $OUTPUT"
