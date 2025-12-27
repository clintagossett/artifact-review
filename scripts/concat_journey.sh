#!/bin/bash
# concat_journey.sh - Combine all video.webm clips from Playwright test results
#
# Playwright creates one subdirectory per test with video.webm inside.
# This script finds all video.webm files in subdirectories and concatenates them.
#
# Usage: ./concat_journey.sh <test_results_dir>
# Example: ./concat_journey.sh test-results

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <test_results_dir>"
    echo "Example: $0 test-results"
    echo ""
    echo "Finds all video.webm files in subdirectories and concatenates them."
    exit 1
fi

JOURNEY_DIR="$(cd "$1" && pwd)"  # Convert to absolute path
OUTPUT="$JOURNEY_DIR/flow.webm"
FILE_LIST="$JOURNEY_DIR/filelist.txt"

# Check if directory exists
if [ ! -d "$JOURNEY_DIR" ]; then
    echo "Error: Directory $JOURNEY_DIR does not exist"
    exit 1
fi

# Find all video.webm files in subdirectories (Playwright test results)
# Playwright creates directories like: test-name-hash-chromium/video.webm
webm_files=()
while IFS= read -r -d '' file; do
    # Get absolute path
    abs_file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
    # Skip the output file if it already exists
    if [ "$abs_file" != "$OUTPUT" ]; then
        webm_files+=("$abs_file")
    fi
done < <(find "$JOURNEY_DIR" -type f -name "video.webm" -print0 | sort -z)

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

# Create file list for ffmpeg with absolute paths
> "$FILE_LIST"
for f in "${webm_files[@]}"; do
    # Use absolute paths for files in subdirectories
    echo "file '$f'" >> "$FILE_LIST"
done

# Concatenate all clips
echo "Concatenating ${#webm_files[@]} clips..."
ffmpeg -y -f concat -safe 0 -i "$FILE_LIST" -c copy "$OUTPUT" 2>&1 | grep -v "^frame=" || true

# Cleanup
rm "$FILE_LIST"

echo "✓ Created: $OUTPUT"
