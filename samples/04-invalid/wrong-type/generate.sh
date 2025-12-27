#!/bin/bash
# Generate ZIP with REAL forbidden video files for validation testing
# This file is NOT committed to git (see .gitignore)

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Generating forbidden file type test samples..."

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ERROR: ffmpeg is required but not installed."
    echo ""
    echo "Install with:"
    echo "  macOS:  brew install ffmpeg"
    echo "  Linux:  apt-get install ffmpeg"
    echo ""
    exit 1
fi

# ============================================
# presentation-with-video.zip
# ============================================
# Contains REAL video files which should be rejected
echo "Creating presentation-with-video.zip (contains REAL forbidden video files)..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

mkdir -p "$TEMP_DIR/presentation"
mkdir -p "$TEMP_DIR/presentation/media"

# Create valid HTML structure
cat > "$TEMP_DIR/presentation/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Presentation with Video</title>
</head>
<body>
  <h1>Product Demo</h1>
  <p>This presentation includes embedded videos.</p>

  <h2>Demo Video (MOV)</h2>
  <video controls width="640">
    <source src="media/demo.mov" type="video/quicktime">
  </video>

  <h2>Intro Video (MP4)</h2>
  <video controls width="640">
    <source src="media/intro.mp4" type="video/mp4">
  </video>

  <h2>Outro Video (AVI)</h2>
  <video controls width="640">
    <source src="media/outro.avi" type="video/x-msvideo">
  </video>
</body>
</html>
EOF

cat > "$TEMP_DIR/presentation/styles.css" <<'EOF'
body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
h1 { color: #2c3e50; }
h2 { color: #34495e; margin-top: 2rem; }
video { border: 1px solid #ddd; border-radius: 4px; }
EOF

# Generate REAL tiny video files using ffmpeg test patterns
echo "Generating real video files with ffmpeg..."

echo "  - Creating demo.mov (QuickTime, ~500KB)..."
ffmpeg -f lavfi -i testsrc=duration=3:size=640x480:rate=15 \
    -f lavfi -i sine=frequency=440:duration=3 \
    -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p \
    -c:a aac -b:a 64k \
    "$TEMP_DIR/presentation/media/demo.mov" \
    -y -loglevel error 2>/dev/null

echo "  - Creating intro.mp4 (MP4, ~300KB)..."
ffmpeg -f lavfi -i testsrc=duration=2:size=480x360:rate=15 \
    -f lavfi -i sine=frequency=523:duration=2 \
    -c:v libx264 -preset ultrafast -crf 30 -pix_fmt yuv420p \
    -c:a aac -b:a 48k \
    "$TEMP_DIR/presentation/media/intro.mp4" \
    -y -loglevel error 2>/dev/null

echo "  - Creating outro.avi (AVI, ~200KB)..."
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=15 \
    -c:v mpeg4 -q:v 10 \
    "$TEMP_DIR/presentation/media/outro.avi" \
    -y -loglevel error 2>/dev/null

# Get actual file sizes
SIZE_MOV=$(stat -f%z "$TEMP_DIR/presentation/media/demo.mov" 2>/dev/null || stat -c%s "$TEMP_DIR/presentation/media/demo.mov" 2>/dev/null)
SIZE_MP4=$(stat -f%z "$TEMP_DIR/presentation/media/intro.mp4" 2>/dev/null || stat -c%s "$TEMP_DIR/presentation/media/intro.mp4" 2>/dev/null)
SIZE_AVI=$(stat -f%z "$TEMP_DIR/presentation/media/outro.avi" 2>/dev/null || stat -c%s "$TEMP_DIR/presentation/media/outro.avi" 2>/dev/null)

SIZE_MOV_KB=$((SIZE_MOV / 1024))
SIZE_MP4_KB=$((SIZE_MP4 / 1024))
SIZE_AVI_KB=$((SIZE_AVI / 1024))

# Create the ZIP
echo "Creating ZIP archive..."
cd "$TEMP_DIR"
zip -r "$DIR/presentation-with-video.zip" presentation/ >/dev/null 2>&1

SIZE_ZIP=$(stat -f%z "$DIR/presentation-with-video.zip" 2>/dev/null || stat -c%s "$DIR/presentation-with-video.zip" 2>/dev/null)
SIZE_ZIP_KB=$((SIZE_ZIP / 1024))

echo ""
echo "=========================================="
echo "✅ presentation-with-video.zip created"
echo "=========================================="
echo "Total ZIP size: ${SIZE_ZIP_KB}KB (well under 100MB limit)"
echo ""
echo "Contents:"
echo "  ✅ index.html (valid HTML with video tags)"
echo "  ✅ styles.css (valid CSS)"
echo "  ❌ media/demo.mov (${SIZE_MOV_KB}KB - REAL QuickTime video - FORBIDDEN)"
echo "  ❌ media/intro.mp4 (${SIZE_MP4_KB}KB - REAL MP4 video - FORBIDDEN)"
echo "  ❌ media/outro.avi (${SIZE_AVI_KB}KB - REAL AVI video - FORBIDDEN)"
echo ""
echo "Video details:"
echo "  - All videos are REAL, playable files with proper:"
echo "    • MIME types (video/quicktime, video/mp4, video/x-msvideo)"
echo "    • Magic bytes/file headers"
echo "    • Metadata (duration, codec, resolution)"
echo "  - Generated using ffmpeg test patterns"
echo "  - Small file sizes for fast testing"
echo ""
echo "Expected behavior:"
echo "  ❌ Should be REJECTED due to forbidden file types"
echo "  ❌ Extension check: .mov, .mp4, .avi detected"
echo "  ❌ MIME type check: video/* detected"
echo "  ❌ Error: 'ZIP contains unsupported file types: .mov, .mp4, .avi'"
echo ""
echo "File is gitignored and must be regenerated for testing."
echo ""
