import { scanFile, isClamAVEnabled } from './clamav';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadContext =
  | 'documents'
  | 'certificates'
  | 'templates'
  | 'bulkUpload'
  | 'photos'
  | 'generic';

export type FileValidationErrorCode =
  | 'BLOCKED_FILE_TYPE'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_CONTENT_MISMATCH'
  | 'MALWARE_DETECTED'
  | 'SCAN_SERVICE_UNAVAILABLE';

export interface FileValidationResult {
  success: boolean;
  error?: string;
  errorCode?: FileValidationErrorCode;
  status?: number;
  detectedMime?: string;
}

interface UploadConfig {
  allowedMimes: string[];
  maxSize: number;
}

// ---------------------------------------------------------------------------
// Upload context configurations
// ---------------------------------------------------------------------------

const MB = 1024 * 1024;

export const UPLOAD_CONFIGS: Record<UploadContext, UploadConfig> = {
  documents: {
    allowedMimes: ['application/pdf'],
    maxSize: 1 * MB,
  },
  certificates: {
    allowedMimes: ['application/pdf'],
    maxSize: 1 * MB,
  },
  templates: {
    allowedMimes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 1 * MB,
  },
  bulkUpload: {
    allowedMimes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
    maxSize: 1 * MB,
  },
  photos: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 1 * MB,
  },
  generic: {
    allowedMimes: ['application/pdf'],
    maxSize: 1 * MB,
  },
};

// ---------------------------------------------------------------------------
// Blocklists
// ---------------------------------------------------------------------------

export const BLOCKED_EXTENSIONS: string[] = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.vbs',
  '.wsf',
  '.msi',
  '.com',
  '.scr',
  '.pif',
  '.dll',
  '.reg',
  '.hta',
  '.cpl',
  '.inf',
  '.jsp',
  '.php',
  '.asp',
  '.aspx',
];

export const BLOCKED_MIMES: string[] = [
  'application/x-executable',
  'application/x-msdos-program',
  'application/x-msdownload',
  'application/x-bat',
  'application/x-cmd',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-msi',
  'application/x-dosexec',
  'application/x-msdos-program',
  'application/x-winexe',
  'application/x-windows-exe',
];

// ---------------------------------------------------------------------------
// Magic-byte detection
// ---------------------------------------------------------------------------

interface MagicSignature {
  offset: number;
  bytes: number[];
  mimeType: string;
}

const MAGIC_SIGNATURES: MagicSignature[] = [
  // PDF: starts with %PDF-
  { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], mimeType: 'application/pdf' },
  // DOC / OLE2: D0 CF 11 E0 A1 B1 1A E1
  {
    offset: 0,
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    mimeType: 'application/msword',
  },
  // DOCX / ZIP / XLSX: 50 4B 03 04
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04], mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  // JPEG: FF D8 FF
  { offset: 0, bytes: [0xff, 0xd8, 0xff], mimeType: 'image/jpeg' },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mimeType: 'image/png' },
  // GIF87a
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], mimeType: 'image/gif' },
  // GIF89a
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], mimeType: 'image/gif' },
  // WebP: RIFF....WEBP
  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp' },
];

const WEBP_MARKER_OFFSET = 8;
const WEBP_MARKER_BYTES = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

/**
 * Detect the MIME type of a file based on magic-byte signatures in its header.
 *
 * For ZIP-based formats (DOCX) this will report the generic DOCX mime; callers
 * that need finer discrimination should inspect the ZIP content further.
 * For CSV / plain-text files, applies a heuristic: if >=85% of the first 512
 * bytes are printable ASCII, the file is classified as text/csv.
 */
export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) {
    return null;
  }

  // Check known magic-byte signatures
  for (const sig of MAGIC_SIGNATURES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      // Special handling for WebP: verify the "WEBP" marker at offset 8
      if (sig.mimeType === 'image/webp') {
        if (
          buffer.length >= WEBP_MARKER_OFFSET + WEBP_MARKER_BYTES.length &&
          WEBP_MARKER_BYTES.every((b, i) => buffer[WEBP_MARKER_OFFSET + i] === b)
        ) {
          return 'image/webp';
        }
        // RIFF header but not WebP — treat as unknown
        return null;
      }
      return sig.mimeType;
    }
  }

  // Heuristic for text/CSV: if >= 85% of the first 512 bytes are printable ASCII
  const sampleSize = Math.min(buffer.length, 512);
  if (sampleSize > 0) {
    let printableCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      // Printable ASCII: 0x20-0x7E, plus common whitespace: \t \n \r
      if (
        (byte >= 0x20 && byte <= 0x7e) ||
        byte === 0x09 || // tab
        byte === 0x0a || // LF
        byte === 0x0d    // CR
      ) {
        printableCount++;
      }
    }
    const ratio = printableCount / sampleSize;
    if (ratio >= 0.85) {
      return 'text/csv'; // broadly covers CSV and other plain-text formats
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Blocklist helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the filename has a blocked extension.
 */
export function isBlockedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Returns true if the declared MIME type is in the blocklist.
 */
export function isBlockedMime(mimeType: string): boolean {
  return BLOCKED_MIMES.includes(mimeType.toLowerCase());
}

// ---------------------------------------------------------------------------
// Compatibility check
// ---------------------------------------------------------------------------

/**
 * MIME types for which we have known magic-byte signatures.
 * When the declared MIME is in this set but detectMimeType returns null,
 * the file content does NOT match any known signature and should be rejected
 * (prevents exe→pdf, sh→docx, and other MIME spoofing attacks).
 */
const KNOWN_MAGIC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/**
 * Determines whether the detected (magic-byte) MIME type is compatible with
 * the declared MIME type.
 *
 * Rules:
 *  - Exact match → compatible
 *  - text/csv is compatible with text/csv, text/plain, and application/vnd.ms-excel
 *  - image/jpeg is compatible with image/jpg (common misdeclaration)
 *  - application/vnd.openxmlformats-officedocument.wordprocessingml.document
 *    is compatible with application/msword (DOCX vs DOC)
 *  - When the declared type has a known magic signature but detectMimeType
 *    returns null, the file is rejected (prevents MIME spoofing attacks).
 */
export function isMimeTypeCompatible(detected: string | null, declared: string): boolean {
  if (!detected) {
    if (KNOWN_MAGIC_MIMES.has(declared)) {
      // Declared type has a known magic signature but none matched — reject spoof attempt
      return false;
    }
    // No magic-byte match for a type without known signatures (CSV, text) — allow through
    return true;
  }

  if (detected === declared) {
    return true;
  }

  // text/csv detected content is compatible with several declared types
  if (
    detected === 'text/csv' &&
    ['text/csv', 'text/plain', 'application/vnd.ms-excel'].includes(declared)
  ) {
    return true;
  }

  // image/jpeg detected is compatible with image/jpg declaration
  if (detected === 'image/jpeg' && declared === 'image/jpg') {
    return true;
  }

  // DOCX detected is compatible with DOC declared (common browser misdeclaration)
  if (
    detected === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    declared === 'application/msword'
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Config lookup helper
// ---------------------------------------------------------------------------

/**
 * Returns the upload configuration for the given context.
 */
export function getUploadConfig(context: UploadContext): UploadConfig {
  return UPLOAD_CONFIGS[context];
}

// ---------------------------------------------------------------------------
// Main validation pipeline
// ---------------------------------------------------------------------------

/**
 * Validates an uploaded file through a multi-step pipeline:
 *
 *  1. Extension blocklist   → 403 BLOCKED_FILE_TYPE
 *  1b. MIME blocklist        → 403 BLOCKED_FILE_TYPE
 *  2. MIME allowlist         → 415 INVALID_FILE_TYPE
 *  3. Size limit             → 413 FILE_TOO_LARGE
 *  4. Magic-byte verification→ 415 FILE_CONTENT_MISMATCH
 *  5. ClamAV scan            → 403 MALWARE_DETECTED / 503 SCAN_SERVICE_UNAVAILABLE
 */
export async function validateFileUpload(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  context: UploadContext,
): Promise<FileValidationResult> {
  // Step 1: Extension blocklist
  if (isBlockedExtension(filename)) {
    return {
      success: false,
      error: `File extension is not allowed: ${filename.substring(filename.lastIndexOf('.'))}`,
      errorCode: 'BLOCKED_FILE_TYPE',
      status: 403,
    };
  }

  // Step 1b: MIME blocklist
  if (isBlockedMime(mimeType)) {
    return {
      success: false,
      error: `MIME type is not allowed: ${mimeType}`,
      errorCode: 'BLOCKED_FILE_TYPE',
      status: 403,
    };
  }

  // Step 2: Context-specific MIME allowlist
  const config = getUploadConfig(context);
  if (!config.allowedMimes.includes(mimeType.toLowerCase())) {
    return {
      success: false,
      error: `File type ${mimeType} is not allowed for context "${context}". Allowed: ${config.allowedMimes.join(', ')}`,
      errorCode: 'INVALID_FILE_TYPE',
      status: 415,
    };
  }

  // Step 3: Context-specific size limit
  if (buffer.length > config.maxSize) {
    return {
      success: false,
      error: `File size ${(buffer.length / MB).toFixed(2)}MB exceeds the ${(config.maxSize / MB).toFixed(0)}MB limit for context "${context}"`,
      errorCode: 'FILE_TOO_LARGE',
      status: 413,
    };
  }

  // Step 4: Magic-byte verification
  const detectedMime = detectMimeType(buffer);
  if (!isMimeTypeCompatible(detectedMime, mimeType.toLowerCase())) {
    return {
      success: false,
      error: `File content does not match declared type. Declared: ${mimeType}, detected: ${detectedMime ?? 'unknown'}`,
      errorCode: 'FILE_CONTENT_MISMATCH',
      status: 415,
      detectedMime: detectedMime ?? undefined,
    };
  }

  // Step 5: ClamAV malware scan
  if (isClamAVEnabled()) {
    const scanResult = await scanFile(buffer);
    if (!scanResult.isClean) {
      if (scanResult.error) {
        // ClamAV was enabled but encountered an error (unreachable, timed out, etc.)
        return {
          success: false,
          error: `Malware scan service unavailable: ${scanResult.error}`,
          errorCode: 'SCAN_SERVICE_UNAVAILABLE',
          status: 503,
          detectedMime: detectedMime ?? undefined,
        };
      }
      // Malware detected
      return {
        success: false,
        error: `Malware detected in file: ${scanResult.virusName ?? 'unknown threat'}`,
        errorCode: 'MALWARE_DETECTED',
        status: 403,
        detectedMime: detectedMime ?? undefined,
      };
    }
  }

  return {
    success: true,
    detectedMime: detectedMime ?? undefined,
  };
}