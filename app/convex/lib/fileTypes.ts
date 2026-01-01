/**
 * File type validation and utilities for unified storage.
 *
 * Application-level validation allows adding new file types
 * without schema migrations.
 *
 * Task: 00018 - Phase 1 - Upload Flow + Write Permissions
 * Step: 1 - Create File Type Helper Module
 */

/**
 * Supported single-file types (HTML, Markdown)
 * These are stored directly in artifactFiles with one row per version.
 */
export const SUPPORTED_SINGLE_FILE_TYPES = ["html", "markdown"] as const;

/**
 * All supported file types (including multi-file ZIP)
 */
export const SUPPORTED_FILE_TYPES = [...SUPPORTED_SINGLE_FILE_TYPES, "zip"] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];
export type SupportedSingleFileType = (typeof SUPPORTED_SINGLE_FILE_TYPES)[number];

/**
 * Validate that a file type string is supported
 */
export function isValidFileType(type: string): type is SupportedFileType {
  return (SUPPORTED_FILE_TYPES as readonly string[]).includes(type);
}

/**
 * Validate that a file type is a single-file type (not ZIP)
 */
export function isSingleFileType(type: string): type is SupportedSingleFileType {
  return (SUPPORTED_SINGLE_FILE_TYPES as readonly string[]).includes(type);
}

/**
 * Get default file path for a file type.
 * Used when no original filename is provided.
 */
export function getDefaultFilePath(fileType: string): string {
  switch (fileType) {
    case "html":
      return "index.html";
    case "markdown":
      return "README.md";
    case "zip":
      return "index.html";
    default:
      return "content";
  }
}

/**
 * Get MIME type for a file type.
 * Used for Content-Type header when serving files.
 */
export function getMimeType(fileType: string): string {
  switch (fileType) {
    case "html":
      return "text/html";
    case "markdown":
      return "text/markdown";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/**
 * Maximum file size for single-file artifacts (5MB)
 */
export const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum characters for version name
 */
export const MAX_VERSION_NAME_LENGTH = 100;

/**
 * Maximum ZIP file size (50MB)
 * Task: 00019 - Multi-file ZIP Projects - Phase 1
 */
export const MAX_ZIP_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum files allowed in a ZIP
 * Task: 00019 - Multi-file ZIP Projects - Phase 1
 */
export const MAX_ZIP_FILE_COUNT = 500;

/**
 * Maximum size per extracted file (5MB)
 * Task: 00019 - Multi-file ZIP Projects - Phase 1
 */
export const MAX_EXTRACTED_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Forbidden file extensions in ZIP (security)
 * Task: 00019 - Multi-file ZIP Projects - Phase 1
 */
export const FORBIDDEN_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1',  // Executables
  '.mov', '.mp4', '.avi', '.mkv', '.wmv',         // Videos
  '.doc', '.docx', '.xls', '.xlsx', '.ppt',       // Office (not needed)
] as const;

/**
 * Validate ZIP file size before upload
 * Task: 00019 - Multi-file ZIP Projects - Phase 1
 */
export function validateZipSize(sizeBytes: number): void {
  if (sizeBytes > MAX_ZIP_FILE_SIZE) {
    throw new Error(
      `ZIP file too large. Maximum: 50MB, got: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }
}

/**
 * Check if a file extension is forbidden
 * Task: 00019 - Multi-file ZIP Projects - Phase 1
 */
export function isForbiddenExtension(filePath: string): boolean {
  const ext = '.' + filePath.toLowerCase().split('.').pop();
  return FORBIDDEN_EXTENSIONS.includes(ext as any);
}
