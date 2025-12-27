#!/bin/bash
# concat_journey.sh - Combine all .webm clips in a journey folder
#
# Usage: ./concat_journey.sh <journey_dir>
# Example: ./concat_journey.sh test-results/login-flow

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <journey_dir>"
    echo "Example: $0 test-results/login-flow"
    exit 1
fi

JOURNEY_DIR="$1"
OUTPUT="$JOURNEY_DIR/flow.webm"
FILE_LIST="$JOURNEY_DIR/filelist.txt"

# Check if directory exists
if [ ! -d "$JOURNEY_DIR" ]; then
    echo "Error: Directory $JOURNEY_DIR does not exist"
    exit 1
fi

# Find all .webm files except flow.webm
webm_files=()
while IFS= read -r -d '' file; do
    filename=$(basename "$file")
    if [ "$filename" != "flow.webm" ]; then
        webm_files+=("$file")
    fi
done < <(find "$JOURNEY_DIR" -maxdepth 1 -name "*.webm" -print0 | sort -z)

# Check if we have files to concatenate
if [ ${#webm_files[@]} -eq 0 ]; then
    echo "No .webm files found in $JOURNEY_DIR"
    exit 1
fi

# If only one file, just copy it
if [ ${#webm_files[@]} -eq 1 ]; then
    echo "Only one video file, copying to flow.webm"
    cp "${webm_files[0]}" "$OUTPUT"
    echo "Created: $OUTPUT"
    exit 0
fi

# Create file list for ffmpeg
> "$FILE_LIST"
for f in "${webm_files[@]}"; do
    echo "file '$(basename "$f")'" >> "$FILE_LIST"
done

# Concatenate all clips
echo "Concatenating ${#webm_files[@]} clips..."
cd "$JOURNEY_DIR"
ffmpeg -y -f concat -safe 0 -i "$(basename "$FILE_LIST")" -c copy flow.webm 2>&1 | grep -v "^frame=" || true

# Cleanup
rm "$FILE_LIST"

echo "✓ Created: $OUTPUT"
