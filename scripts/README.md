# Video Assembly Scripts

Scripts for assembling E2E test recordings into final validation videos with title slides.

## Prerequisites

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

## Scripts

### assemble-validation-video.sh (Main)

Orchestrates the full video assembly workflow.

**Usage:**
```bash
./assemble-validation-video.sh \
  --title "Login Flow" test-results/login-flow \
  --title "Signup Flow" test-results/signup-flow \
  --output validation-videos/master-validation.mp4
```

**What it does:**
1. Generates title slides for each journey
2. Concatenates clips within each journey (if needed)
3. Normalizes all videos to 1280x720, 30fps, H.264
4. Assembles final MP4 with titles between journeys

### video_assembler.py (Python Alternative)

Python implementation with better error handling and progress reporting.

**Usage:**
```bash
python video_assembler.py \
  --output validation-videos/master.mp4 \
  --journey "Login Flow" test-results/login-flow \
  --journey "Signup Flow" test-results/signup-flow
```

**Requirements:** Python 3.7+

### Individual Scripts

#### concat_journey.sh

Combine multiple .webm files within a journey folder.

```bash
./concat_journey.sh test-results/login-flow
# Creates: test-results/login-flow/flow.webm
```

#### create_title.sh

Generate a title slide video.

```bash
./create_title.sh "Login Flow" titles/01-login.mp4 3 1280 720
# Args: title, output, duration, width, height
```

#### normalize_video.sh

Normalize video to consistent format.

```bash
./normalize_video.sh input.webm output.mp4 1280 720 30
# Args: input, output, width, height, fps
```

## Understanding Playwright Test Results

**IMPORTANT:** Playwright creates **one subdirectory per test** with hash-based names:

```
test-results/
├── magic-link-Auth-abc123-chromium/
│   ├── video.webm          # Video for test 1
│   ├── trace.zip
│   └── test-finished-1.png
├── magic-link-Auth-def456-chromium/
│   └── video.webm          # Video for test 2
└── magic-link-Auth-ghi789-chromium/
    └── video.webm          # Video for test 3
```

The scripts find all `video.webm` files in subdirectories and combine them.

## Typical Workflow

### From Task Tests Directory

```bash
cd tasks/00008-magic-link-auth/tests

# 1. Run E2E tests (generates videos)
npx playwright test

# 2. Simple approach: Combine all tests into one video
../../../../scripts/concat_journey.sh test-results
../../../../scripts/normalize_video.sh test-results/flow.webm validation-videos/validation.mp4

# OR: Advanced approach with title slides
../../../../scripts/assemble-validation-video.sh \
  --title "Magic Link Authentication" test-results \
  --output validation-videos/master-validation.mp4

# 3. View result
open validation-videos/master-validation.mp4
```

**Note:** Since Playwright already separates tests into subdirectories, you typically pass the entire `test-results` directory to the scripts. If you have logically separate flows (e.g., different features), run them as separate Playwright test sessions and assemble with different titles.

## Output Format

The assembled video will:
- Be 1280x720 resolution
- Run at 30fps
- Use H.264 codec (MP4)
- Have no audio (silent demo)
- Include 3-second title slides between sections

## Troubleshooting

### "Non-monotonous DTS" warnings
Videos have inconsistent timestamps. The normalization step fixes this automatically.

### Different resolutions between clips
The normalize step handles this by letterboxing if needed.

### Title text not rendering
**macOS:** Font should auto-detect (Arial or Helvetica)
**Linux:** Install fonts: `sudo apt install fonts-dejavu`

### Large output file size
Adjust CRF in `normalize_video.sh`:
- CRF 23 (default) - balanced quality/size
- CRF 28 - smaller file, lower quality
- CRF 18 - higher quality, larger file

## Integration with Testing Guide

See `docs/development/testing-guide.md` for full workflow documentation.
