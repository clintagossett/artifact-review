#!/bin/bash
set -e

# File to upload
cd app
ZIP_FILE="../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip"
FILE_SIZE=$(stat -f%z "$ZIP_FILE" 2>/dev/null || stat -c%s "$ZIP_FILE")

echo "Uploading $ZIP_FILE (Size: $FILE_SIZE bytes)..."

# 1. Create Artifact and get Upload URL
# We use node to parse the JSON output from convex run
OUTPUT=$(npx convex run --push test_utils:createArtifactForTest \
  "{\"name\": \"Mixed Media Sample\", \"description\": \"Test artifact with Mermaid and nested files\", \"size\": $FILE_SIZE}")

UPLOAD_URL=$(echo "$OUTPUT" | grep -o '"uploadUrl": *"[^"]*"' | cut -d'"' -f4)
VERSION_ID=$(echo "$OUTPUT" | grep -o '"versionId": *"[^"]*"' | cut -d'"' -f4)
SHARE_TOKEN=$(echo "$OUTPUT" | grep -o '"shareToken": *"[^"]*"' | cut -d'"' -f4)

echo "Created Artifact. Version ID: $VERSION_ID"
echo "Upload URL: $UPLOAD_URL"

# 2. Upload File
echo "Uploading file content..."
UPLOAD_RESP=$(curl -s -X POST "$UPLOAD_URL" --data-binary "@$ZIP_FILE" -H "Content-Type: application/zip")
STORAGE_ID=$(echo "$UPLOAD_RESP" | grep -o '"storageId": *"[^"]*"' | cut -d'"' -f4)

echo "File uploaded. Storage ID: $STORAGE_ID"

# 3. Trigger Processing
echo "Triggering ZIP processing..."
npx convex run test_utils:triggerZipProcessingForTest \
  "{\"versionId\": \"$VERSION_ID\", \"storageId\": \"$STORAGE_ID\"}"

echo "---------------------------------------------------"
echo "Success! Artifact uploaded."
echo "View it here: http://localhost:3000/a/$SHARE_TOKEN"
echo "---------------------------------------------------"
