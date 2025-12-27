# Oversized File Test Sample

## Purpose

Tests that the system properly rejects files exceeding size limits.

## Generated File

**`huge.zip`** - 150MB+ (exceeds 100MB limit)

**Real-world scenario:** PowerPoint-to-HTML export with embedded video

## Why Generated?

This file is **not committed to git** because:
- 150MB+ is too large for version control
- File contents are disposable (random data)
- Easy to regenerate on demand

## How to Generate

```bash
cd samples/04-invalid/too-large
./generate.sh
```

This creates:
- `huge.zip` (~155MB)
  - Contains: presentation HTML, CSS, and a 155MB .mov file
  - Mimics real PowerPoint exports with video

## Expected Behavior

**Frontend:**
- ❌ File picker should warn: "File exceeds 100MB limit"
- ❌ Upload button disabled

**Backend (if frontend bypassed):**
- ❌ Status 400: "File exceeds maximum size of 100MB"
- ❌ Upload rejected before processing

## Testing Notes

- Tests SIZE validation, not file type validation
- File contains realistic structure (HTML + video)
- Validates both frontend and backend size checks
- Ensures large files don't consume server resources

---

**Last Updated:** 2025-12-27
**Related Task:** #10 - Artifact Upload & Validation
