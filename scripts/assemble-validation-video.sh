#!/bin/bash
# assemble-validation-video.sh - Assemble E2E test videos into master validation video
#
# Usage: ./assemble-validation-video.sh --title "Flow 1" path1 --title "Flow 2" path2 --output master.mp4
# Example:
#   ./assemble-validation-video.sh \
#     --title "Login Flow" test-results/login-flow \
#     --title "Signup Flow" test-results/signup-flow \
#     --output validation-videos/master-validation.mp4

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Arrays to store journeys
JOURNEY_TITLES=()
JOURNEY_DIRS=()
OUTPUT_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --title)
            JOURNEY_TITLES+=("$2")
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 --title \"Title\" <dir> [--title \"Title\" <dir>...] --output <file>"
            echo ""
            echo "Example:"
            echo "  $0 \\"
            echo "    --title \"Login Flow\" test-results/login-flow \\"
            echo "    --title \"Signup Flow\" test-results/signup-flow \\"
            echo "    --output validation-videos/master-validation.mp4"
            exit 0
            ;;
        *)
            JOURNEY_DIRS+=("$1")
            shift
            ;;
    esac
done

# Validation
if [ ${#JOURNEY_TITLES[@]} -eq 0 ]; then
    echo "Error: No journeys specified"
    echo "Use --help for usage information"
    exit 1
fi

if [ ${#JOURNEY_TITLES[@]} -ne ${#JOURNEY_DIRS[@]} ]; then
    echo "Error: Number of titles (${#JOURNEY_TITLES[@]}) doesn't match number of directories (${#JOURNEY_DIRS[@]})"
    exit 1
fi

if [ -z "$OUTPUT_FILE" ]; then
    echo "Error: No output file specified (use --output)"
    exit 1
fi

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"
mkdir -p "$TEMP_DIR/titles"

echo "Assembling validation video with ${#JOURNEY_TITLES[@]} journeys..."
echo ""

# Master concat list
MASTER_LIST="$TEMP_DIR/master_list.txt"
> "$MASTER_LIST"

# Process each journey
for i in "${!JOURNEY_TITLES[@]}"; do
    TITLE="${JOURNEY_TITLES[$i]}"
    DIR="${JOURNEY_DIRS[$i]}"

    echo "[$((i+1))/${#JOURNEY_TITLES[@]}] Processing: $TITLE"

    # 1. Create title slide
    TITLE_FILE="$TEMP_DIR/titles/$(printf "%02d" $i)_title.mp4"
    echo "  → Generating title slide..."
    "$SCRIPT_DIR/create_title.sh" "$TITLE" "$TITLE_FILE" 3 1280 720
    echo "file '$TITLE_FILE'" >> "$MASTER_LIST"

    # 2. Find or create flow.webm
    FLOW_FILE="$DIR/flow.webm"
    if [ ! -f "$FLOW_FILE" ]; then
        echo "  → Concatenating clips..."
        "$SCRIPT_DIR/concat_journey.sh" "$DIR"
    else
        echo "  → Using existing flow.webm"
    fi

    # 3. Normalize video
    NORMALIZED_FILE="$TEMP_DIR/$(printf "%02d" $i)_journey.mp4"
    echo "  → Normalizing video..."
    "$SCRIPT_DIR/normalize_video.sh" "$FLOW_FILE" "$NORMALIZED_FILE" 1280 720 30
    echo "file '$NORMALIZED_FILE'" >> "$MASTER_LIST"

    echo ""
done

# Final concatenation
echo "Creating master video..."
ffmpeg -y -f concat -safe 0 -i "$MASTER_LIST" -c copy "$OUTPUT_FILE" 2>&1 | grep -v "^frame=" || true

echo ""
echo "✓ Master validation video created: $OUTPUT_FILE"
echo ""
echo "View with: open \"$OUTPUT_FILE\""
