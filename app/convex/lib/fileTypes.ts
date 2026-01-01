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
