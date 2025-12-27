#!/bin/bash
# Generate oversized ZIP test file for validation testing
# This file is NOT committed to git (see .gitignore)

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Generating oversized test file..."

# ============================================
# huge.zip - 150MB (exceeds 100MB limit)
# ============================================
# Real-world scenario: PowerPoint export with embedded video
echo "Creating huge.zip (150MB) - Simulates PowerPoint export with video..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

mkdir -p "$TEMP_DIR/presentation-export"
mkdir -p "$TEMP_DIR/presentation-export/media"

# Create realistic PowerPoint-to-HTML export structure
cat > "$TEMP_DIR/presentation-export/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Product Demo Presentation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .slide { max-width: 960px; margin: 0 auto 40px; padding: 20px; border: 1px solid #ddd; }
    video { width: 100%; max-width: 800px; }
  </style>
</head>
<body>
  <div class="slide">
    <h1>Product Demo Presentation</h1>
    <p>Exported from PowerPoint with embedded video</p>
  </div>

  <div class="slide">
    <h2>Slide 1: Product Overview</h2>
    <p>Introduction to our product...</p>
  </div>

  <div class="slide">
    <h2>Slide 2: Demo Video</h2>
    <video controls>
      <source src="media/demo-video.mov" type="video/quicktime">
      Your browser does not support the video tag.
    </video>
  </div>

  <div class="slide">
    <h2>Slide 3: Conclusion</h2>
    <p>Thank you for watching!</p>
  </div>
</body>
</html>
EOF

cat > "$TEMP_DIR/presentation-export/styles.css" <<'EOF'
/* PowerPoint export styles */
.slide { background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
h1, h2 { color: #2c3e50; }
EOF

# Create a large "video" file (155MB) using random data
# In reality this would be a .mov file from the PowerPoint
echo "Generating 155MB mock video file..."
dd if=/dev/urandom of="$TEMP_DIR/presentation-export/media/demo-video.mov" bs=1m count=155 2>/dev/null

# Add some slide image exports (common in PowerPoint exports)
echo "Adding slide preview images..."
for i in {1..3}; do
  # Create small mock PNG files (would be slide screenshots in real export)
  dd if=/dev/urandom of="$TEMP_DIR/presentation-export/media/slide${i}.png" bs=1k count=50 2>/dev/null
done

# Create the ZIP
echo "Creating ZIP archive..."
cd "$TEMP_DIR"
zip -r "$DIR/huge.zip" presentation-export/ >/dev/null 2>&1

SIZE_ZIP=$(stat -f%z "$DIR/huge.zip" 2>/dev/null || stat -c%s "$DIR/huge.zip" 2>/dev/null)
SIZE_MB=$((SIZE_ZIP / 1024 / 1024))

echo ""
echo "=========================================="
echo "✅ huge.zip created successfully"
echo "=========================================="
echo "Size: ${SIZE_MB}MB ($(numfmt --to=iec-i --suffix=B $SIZE_ZIP 2>/dev/null || echo "${SIZE_ZIP} bytes"))"
echo "Limit: 100MB"
echo "Contents:"
echo "  - index.html (presentation structure)"
echo "  - styles.css"
echo "  - media/demo-video.mov (155MB)"
echo "  - media/slide1-3.png (slide previews)"
echo ""
echo "This simulates a real PowerPoint export with embedded video."
echo "File is gitignored and must be regenerated for testing."
echo ""
