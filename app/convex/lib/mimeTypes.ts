/**
 * Get MIME type from filename extension
 * Task: 00019 - Added additional types for ZIP projects (Phase 2)
 */
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    // HTML
    'html': 'text/html',
    'htm': 'text/html',

    // CSS
    'css': 'text/css',

    // JavaScript
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'ts': 'application/typescript',

    // Data formats
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',

    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'avif': 'image/avif',

    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',

    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',

    // Archives
    'zip': 'application/zip',

    // Source maps (for debugging)
    'map': 'application/json',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
