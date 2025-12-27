# Forbidden File Type Test Sample

## Purpose

Tests that the system properly rejects ZIPs containing forbidden file types (videos), even when under size limits.

## Generated File

**`presentation-with-video.zip`** - ~110KB (under limit, but contains forbidden files)

**Real-world scenario:** User uploads PowerPoint export containing video files

## Why Generated?

This file is **not committed to git** because:
- Contains **REAL video files** generated with ffmpeg (playable, proper MIME types)
- Easy to regenerate on demand with `./generate.sh`
- Keeps repo clean

**Note:** Requires `ffmpeg` to be installed (`brew install ffmpeg`)

## How to Generate

```bash
cd samples/04-invalid/wrong-type
./generate.sh
```

This creates:
- `presentation-with-video.zip` (~110KB)
  - Valid files: `index.html`, `styles.css`
  - **Forbidden REAL video files:**
    - `media/demo.mov` (67KB - 3 sec, 640x480, H.264+AAC)
    - `media/intro.mp4` (42KB - 2 sec, 480x360, H.264+AAC)
    - `media/outro.avi` (28KB - 1 sec, 320x240, MPEG-4)

## Expected Behavior

**During ZIP extraction/validation:**
- ❌ Detect forbidden file extensions: `.mov`, `.mp4`, `.avi`
- ❌ Status 400: "ZIP contains unsupported file types: .mov, .mp4, .avi"
- ❌ Provide guidance: "Videos are not supported. Please remove video files and re-upload."

**Key Points:**
- File size is UNDER the limit (~110KB vs 100MB max)
- Videos are **REAL** - playable with proper MIME types, codecs, metadata
- Rejection is based on FILE TYPE, not size
- Tests extension, MIME type, and magic byte validation
- Generated using ffmpeg test patterns (testsrc video + sine audio)

## Forbidden File Types

The system should reject ZIPs containing:
- Video: `.mov`, `.mp4`, `.avi`, `.wmv`, `.flv`, `.mkv`, `.webm`
- Audio: `.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`
- Executables: `.exe`, `.dll`, `.app`, `.dmg`, `.sh`, `.bat`
- Archives: `.zip`, `.tar`, `.gz`, `.rar`, `.7z` (nested archives)
- Other: `.pdf` (maybe?), `.doc`, `.docx`, `.ppt`, `.pptx`

**Allowed file types:**
- HTML: `.html`, `.htm`
- Styles: `.css`
- Scripts: `.js`, `.mjs`
- Data: `.json`
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`
- Fonts: `.woff`, `.woff2`, `.ttf`, `.otf`
- Text: `.txt`, `.md`

## Testing Notes

- Validates file type checking, not size checking
- Ensures security (no executables)
- Prevents bloat (no videos/audio)
- User-friendly error messages

---

**Last Updated:** 2025-12-27
**Related Task:** #10 - Artifact Upload & Validation
