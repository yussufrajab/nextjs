/**
 * Tests for file validation module
 * Covers UPLOAD_CONFIGS, blocklists, MIME detection, compatibility, and the full validation pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFileUpload,
  UPLOAD_CONFIGS,
  BLOCKED_EXTENSIONS,
  BLOCKED_MIMES,
  isBlockedExtension,
  isBlockedMime,
  detectMimeType,
  isMimeTypeCompatible,
  getUploadConfig,
  FileValidationErrorCode,
  FileValidationResult,
  UploadContext,
} from './file-validation';
import { scanFile, isClamAVEnabled } from './clamav';

// ---------------------------------------------------------------------------
// Mock ClamAV module
// ---------------------------------------------------------------------------

vi.mock('./clamav', () => ({
  scanFile: vi.fn().mockResolvedValue({ isClean: true }),
  isClamAVEnabled: vi.fn().mockReturnValue(true),
}));

// ---------------------------------------------------------------------------
// Test buffer helpers
// ---------------------------------------------------------------------------

function createPdfBuffer(size = 1024): Buffer {
  const header = Buffer.from('%PDF-1.4\n');
  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x20);
  return Buffer.concat([header, padding]);
}

function createJpegBuffer(size = 1024): Buffer {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x00);
  return Buffer.concat([header, padding]);
}

function createPngBuffer(size = 1024): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x00);
  return Buffer.concat([header, padding]);
}

function createDocBuffer(size = 1024): Buffer {
  const header = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x00);
  return Buffer.concat([header, padding]);
}

function createDocxBuffer(size = 2048): Buffer {
  const header = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x00);
  return Buffer.concat([header, padding]);
}

function createCsvBuffer(content = 'Name,Age,City\nJohn,30,NYC'): Buffer {
  return Buffer.from(content, 'utf-8');
}

function createGifBuffer(size = 1024): Buffer {
  const header = Buffer.from('GIF87a');
  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x00);
  return Buffer.concat([header, padding]);
}

function createWebpBuffer(size = 1024): Buffer {
  // WebP: RIFF <size> WEBP ...
  const riff = Buffer.from('RIFF');
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32LE(size - 8, 0);
  const webp = Buffer.from('WEBP');
  const padding = Buffer.alloc(Math.max(0, size - 12), 0x00);
  return Buffer.concat([riff, sizeBuf, webp, padding]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('file-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations
    vi.mocked(scanFile).mockResolvedValue({ isClean: true });
    vi.mocked(isClamAVEnabled).mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // UPLOAD_CONFIGS
  // -------------------------------------------------------------------------

  describe('UPLOAD_CONFIGS', () => {
    it('should have config for all 6 upload contexts', () => {
      const contexts: UploadContext[] = [
        'documents',
        'certificates',
        'templates',
        'bulkUpload',
        'photos',
        'generic',
      ];
      for (const ctx of contexts) {
        expect(UPLOAD_CONFIGS[ctx]).toBeDefined();
        expect(UPLOAD_CONFIGS[ctx]).toHaveProperty('allowedMimes');
        expect(UPLOAD_CONFIGS[ctx]).toHaveProperty('maxSize');
      }
    });

    it('should have correct size limits', () => {
      const MB = 1024 * 1024;
      expect(UPLOAD_CONFIGS.documents.maxSize).toBe(1 * MB);
      expect(UPLOAD_CONFIGS.certificates.maxSize).toBe(1 * MB);
      expect(UPLOAD_CONFIGS.templates.maxSize).toBe(1 * MB);
      expect(UPLOAD_CONFIGS.bulkUpload.maxSize).toBe(1 * MB);
      expect(UPLOAD_CONFIGS.photos.maxSize).toBe(1 * MB);
      expect(UPLOAD_CONFIGS.generic.maxSize).toBe(1 * MB);
    });
  });

  // -------------------------------------------------------------------------
  // getUploadConfig
  // -------------------------------------------------------------------------

  describe('getUploadConfig', () => {
    it('should return config for a valid context', () => {
      const config = getUploadConfig('documents');
      expect(config).toEqual(UPLOAD_CONFIGS.documents);
    });

    it('should return correct config for each context', () => {
      const contexts: UploadContext[] = [
        'documents',
        'certificates',
        'templates',
        'bulkUpload',
        'photos',
        'generic',
      ];
      for (const ctx of contexts) {
        expect(getUploadConfig(ctx)).toEqual(UPLOAD_CONFIGS[ctx]);
      }
    });
  });

  // -------------------------------------------------------------------------
  // isBlockedExtension
  // -------------------------------------------------------------------------

  describe('isBlockedExtension', () => {
    it('should block .exe files', () => {
      expect(isBlockedExtension('malware.exe')).toBe(true);
    });

    it('should block .bat files', () => {
      expect(isBlockedExtension('script.bat')).toBe(true);
    });

    it('should block .sh files', () => {
      expect(isBlockedExtension('run.sh')).toBe(true);
    });

    it('should block .php files', () => {
      expect(isBlockedExtension('index.php')).toBe(true);
    });

    it('should block .jsp files', () => {
      expect(isBlockedExtension('page.jsp')).toBe(true);
    });

    it('should block .asp files', () => {
      expect(isBlockedExtension('page.asp')).toBe(true);
    });

    it('should allow .pdf files', () => {
      expect(isBlockedExtension('document.pdf')).toBe(false);
    });

    it('should allow .docx files', () => {
      expect(isBlockedExtension('report.docx')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isBlockedExtension('MALWARE.EXE')).toBe(true);
      expect(isBlockedExtension('Script.BaT')).toBe(true);
      expect(isBlockedExtension('Page.PHP')).toBe(true);
    });

    it('should handle files with no extension', () => {
      expect(isBlockedExtension('README')).toBe(false);
    });

    it('should block all extensions in the blocklist', () => {
      for (const ext of BLOCKED_EXTENSIONS) {
        expect(isBlockedExtension(`file${ext}`)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // isBlockedMime
  // -------------------------------------------------------------------------

  describe('isBlockedMime', () => {
    it('should block application/x-executable', () => {
      expect(isBlockedMime('application/x-executable')).toBe(true);
    });

    it('should block application/x-bat', () => {
      expect(isBlockedMime('application/x-bat')).toBe(true);
    });

    it('should block application/x-sh', () => {
      expect(isBlockedMime('application/x-sh')).toBe(true);
    });

    it('should block application/x-shellscript', () => {
      expect(isBlockedMime('application/x-shellscript')).toBe(true);
    });

    it('should allow application/pdf', () => {
      expect(isBlockedMime('application/pdf')).toBe(false);
    });

    it('should allow image/jpeg', () => {
      expect(isBlockedMime('image/jpeg')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isBlockedMime('Application/X-Executable')).toBe(true);
      expect(isBlockedMime('APPLICATION/X-BAT')).toBe(true);
    });

    it('should block all MIMEs in the blocklist', () => {
      for (const mime of BLOCKED_MIMES) {
        expect(isBlockedMime(mime)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // detectMimeType
  // -------------------------------------------------------------------------

  describe('detectMimeType', () => {
    it('should detect PDF files', () => {
      const buffer = createPdfBuffer();
      expect(detectMimeType(buffer)).toBe('application/pdf');
    });

    it('should detect JPEG files', () => {
      const buffer = createJpegBuffer();
      expect(detectMimeType(buffer)).toBe('image/jpeg');
    });

    it('should detect PNG files', () => {
      const buffer = createPngBuffer();
      expect(detectMimeType(buffer)).toBe('image/png');
    });

    it('should detect DOC (OLE2) files', () => {
      const buffer = createDocBuffer();
      expect(detectMimeType(buffer)).toBe('application/msword');
    });

    it('should detect GIF files', () => {
      const buffer = createGifBuffer();
      expect(detectMimeType(buffer)).toBe('image/gif');
    });

    it('should detect WebP files', () => {
      const buffer = createWebpBuffer();
      expect(detectMimeType(buffer)).toBe('image/webp');
    });

    it('should detect CSV (text) files', () => {
      const buffer = createCsvBuffer();
      expect(detectMimeType(buffer)).toBe('text/csv');
    });

    it('should return null for unknown binary data', () => {
      // Random binary that doesn't match any magic signature
      const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff, 0xaa, 0x55]);
      expect(detectMimeType(buffer)).toBeNull();
    });

    it('should return null for buffers smaller than 4 bytes', () => {
      expect(detectMimeType(Buffer.from([0x25, 0x50, 0x44]))).toBeNull();
    });

    it('should detect DOCX files', () => {
      const buffer = createDocxBuffer();
      expect(detectMimeType(buffer)).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });
  });

  // -------------------------------------------------------------------------
  // isMimeTypeCompatible
  // -------------------------------------------------------------------------

  describe('isMimeTypeCompatible', () => {
    it('should return true for exact match', () => {
      expect(isMimeTypeCompatible('application/pdf', 'application/pdf')).toBe(true);
      expect(isMimeTypeCompatible('image/jpeg', 'image/jpeg')).toBe(true);
    });

    it('should allow text/csv compatibility with text/csv', () => {
      expect(isMimeTypeCompatible('text/csv', 'text/csv')).toBe(true);
    });

    it('should allow text/csv compatibility with text/plain', () => {
      expect(isMimeTypeCompatible('text/csv', 'text/plain')).toBe(true);
    });

    it('should allow text/csv compatibility with application/vnd.ms-excel', () => {
      expect(isMimeTypeCompatible('text/csv', 'application/vnd.ms-excel')).toBe(true);
    });

    it('should reject mismatched MIME types', () => {
      expect(isMimeTypeCompatible('application/pdf', 'image/jpeg')).toBe(false);
      expect(isMimeTypeCompatible('image/png', 'application/pdf')).toBe(false);
    });

    it('should reject null detected type when the declared type has known magic signatures', () => {
      // application/pdf has a known magic signature but no match was found — reject spoof
      expect(isMimeTypeCompatible(null, 'application/pdf')).toBe(false);
    });

    it('should allow null detected type for CSV (no known magic signature)', () => {
      // text/csv has no known magic signature, so null detection is acceptable
      expect(isMimeTypeCompatible(null, 'text/csv')).toBe(true);
    });

    it('should allow image/jpeg compatible with image/jpg', () => {
      expect(isMimeTypeCompatible('image/jpeg', 'image/jpg')).toBe(true);
    });

    it('should allow DOCX detected with DOC declared', () => {
      expect(
        isMimeTypeCompatible(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword'
        )
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // validateFileUpload - full pipeline
  // -------------------------------------------------------------------------

  describe('validateFileUpload', () => {
    // --- Accepts valid files ---

    it('should accept valid PDF for documents context', async () => {
      const buffer = createPdfBuffer(512);
      const result = await validateFileUpload(buffer, 'report.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(true);
    });

    it('should accept JPEG for photos context', async () => {
      const buffer = createJpegBuffer(512);
      const result = await validateFileUpload(buffer, 'photo.jpg', 'image/jpeg', 'photos');
      expect(result.success).toBe(true);
    });

    it('should accept PNG for photos context', async () => {
      const buffer = createPngBuffer(512);
      const result = await validateFileUpload(buffer, 'photo.png', 'image/png', 'photos');
      expect(result.success).toBe(true);
    });

    it('should accept CSV for bulkUpload context', async () => {
      const buffer = createCsvBuffer();
      const result = await validateFileUpload(buffer, 'data.csv', 'text/csv', 'bulkUpload');
      expect(result.success).toBe(true);
    });

    it('should accept DOCX for templates context', async () => {
      const buffer = createDocxBuffer(512);
      const result = await validateFileUpload(
        buffer,
        'template.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'templates'
      );
      expect(result.success).toBe(true);
    });

    it('should accept DOC for templates context', async () => {
      const buffer = createDocBuffer(512);
      const result = await validateFileUpload(
        buffer,
        'template.doc',
        'application/msword',
        'templates'
      );
      expect(result.success).toBe(true);
    });

    // --- Rejects executable files (FILE-01) ---

    it('should reject .exe files with BLOCKED_FILE_TYPE (403)', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'malware.exe', 'application/x-executable', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
      expect(result.status).toBe(403);
    });

    it('should reject .bat files regardless of MIME type', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'script.bat', 'text/plain', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
      expect(result.status).toBe(403);
    });

    it('should reject .sh files', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'run.sh', 'text/plain', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    it('should reject .php files', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'index.php', 'text/plain', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    it('should reject .jsp files', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'page.jsp', 'text/plain', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    it('should reject .asp files', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'page.asp', 'text/plain', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    // --- Rejects blocked MIME types ---

    it('should reject files with blocked MIME types', async () => {
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'file.pdf', 'application/x-executable', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
      expect(result.status).toBe(403);
    });

    // --- Rejects oversized files (FILE-02) ---

    it('should reject oversized files with FILE_TOO_LARGE (413)', async () => {
      // documents context allows 1 MB; create a buffer larger than that
      const MB = 1024 * 1024;
      const oversizedBuffer = Buffer.alloc(2 * MB);
      const result = await validateFileUpload(
        oversizedBuffer,
        'big.pdf',
        'application/pdf',
        'documents'
      );
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_TOO_LARGE');
      expect(result.status).toBe(413);
    });

    // --- Rejects wrong MIME type (FILE-04) ---

    it('should reject wrong MIME type with INVALID_FILE_TYPE (415)', async () => {
      const buffer = createPdfBuffer(512);
      const result = await validateFileUpload(buffer, 'report.pdf', 'image/jpeg', 'documents');
      // image/jpeg is not in the documents allowed list
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_FILE_TYPE');
      expect(result.status).toBe(415);
    });

    // --- Rejects spoofed extensions (FILE content mismatch) ---

    it('should reject files with spoofed extension (content mismatch)', async () => {
      // A JPEG buffer with .pdf extension
      const buffer = createJpegBuffer(512);
      const result = await validateFileUpload(buffer, 'photo.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_CONTENT_MISMATCH');
    });

    // --- Rejects PDF in photos context ---

    it('should reject PDF in photos context', async () => {
      const buffer = createPdfBuffer(512);
      const result = await validateFileUpload(buffer, 'photo.pdf', 'application/pdf', 'photos');
      expect(result.success).toBe(false);
      // application/pdf not in photos allowed mimes
      expect(result.errorCode).toBe('INVALID_FILE_TYPE');
    });

    // -------------------------------------------------------------------------
    // Test 10.4: File Type Validation — Disguised executables
    // -------------------------------------------------------------------------

    it('should reject disguised executable (.pdf.exe) via extension blocklist', async () => {
      // .exe is the last extension — blocked by extension list
      const buffer = Buffer.alloc(100);
      const result = await validateFileUpload(buffer, 'report.pdf.exe', 'application/x-executable', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
      expect(result.status).toBe(403);
    });

    it('should reject disguised executable (.exe.pdf) via magic-byte mismatch', async () => {
      // Starts with MZ (EXE header) but claims to be PDF — magic bytes won't match
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
      const result = await validateFileUpload(exeBuffer, 'document.exe.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_CONTENT_MISMATCH');
    });

    // -------------------------------------------------------------------------
    // Test 10.5: MIME Type Spoofing — magic-byte verification
    // -------------------------------------------------------------------------

    it('should reject executable renamed to .pdf via magic-byte verification', async () => {
      // EXE with MZ header, declared as application/pdf
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
      const result = await validateFileUpload(exeBuffer, 'notavirus.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_CONTENT_MISMATCH');
    });

    it('should reject shell script renamed to .pdf via magic-byte verification', async () => {
      // Shell script starts with #!/bin/sh
      const shBuffer = Buffer.from('#!/bin/sh\nrm -rf /');
      const result = await validateFileUpload(shBuffer, 'clean.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_CONTENT_MISMATCH');
    });

    it('should reject batch file renamed to .docx via magic-byte verification', async () => {
      const batBuffer = Buffer.from('@echo off\ndel /F /S *.*');
      const result = await validateFileUpload(batBuffer, 'document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'templates');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_CONTENT_MISMATCH');
    });

    // -------------------------------------------------------------------------
    // Test 10.6: File Size Limit — boundary tests
    // -------------------------------------------------------------------------

    it('should accept file exactly at the size limit', async () => {
      const MB = 1024 * 1024;
      const buffer = createPdfBuffer(MB);
      const result = await validateFileUpload(buffer, 'exact.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(true);
    });

    it('should accept file just under the size limit', async () => {
      const MB = 1024 * 1024;
      const buffer = createPdfBuffer(MB - 1);
      const result = await validateFileUpload(buffer, 'small.pdf', 'application/pdf', 'documents');
      expect(result.success).toBe(true);
    });

    it('should reject 100MB file with FILE_TOO_LARGE', async () => {
      const MB = 1024 * 1024;
      const oversizedBuffer = Buffer.alloc(100 * MB);
      const result = await validateFileUpload(
        oversizedBuffer,
        'huge.pdf',
        'application/pdf',
        'documents'
      );
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FILE_TOO_LARGE');
      expect(result.status).toBe(413);
    });

    // -------------------------------------------------------------------------
    // ClamAV integration
    // -------------------------------------------------------------------------

    describe('ClamAV integration', () => {
      it('should reject when ClamAV detects malware (MALWARE_DETECTED, 403)', async () => {
        vi.mocked(scanFile).mockResolvedValueOnce({
          isClean: false,
          virusName: 'EICAR-Test',
        });

        const buffer = createPdfBuffer(512);
        const result = await validateFileUpload(
          buffer,
          'infected.pdf',
          'application/pdf',
          'documents'
        );
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('MALWARE_DETECTED');
        expect(result.status).toBe(403);
        expect(result.error).toContain('EICAR-Test');
      });

      it('should reject when ClamAV is unavailable and enabled (SCAN_SERVICE_UNAVAILABLE, 503)', async () => {
        vi.mocked(scanFile).mockResolvedValueOnce({
          isClean: false,
          error: 'Connection refused',
        });

        const buffer = createPdfBuffer(512);
        const result = await validateFileUpload(
          buffer,
          'report.pdf',
          'application/pdf',
          'documents'
        );
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SCAN_SERVICE_UNAVAILABLE');
        expect(result.status).toBe(503);
      });

      it('should pass when ClamAV scan is clean', async () => {
        vi.mocked(scanFile).mockResolvedValueOnce({ isClean: true });

        const buffer = createPdfBuffer(512);
        const result = await validateFileUpload(
          buffer,
          'clean.pdf',
          'application/pdf',
          'documents'
        );
        expect(result.success).toBe(true);
      });

      it('should skip ClamAV scan when disabled', async () => {
        vi.mocked(isClamAVEnabled).mockReturnValue(false);

        const buffer = createPdfBuffer(512);
        const result = await validateFileUpload(
          buffer,
          'clean.pdf',
          'application/pdf',
          'documents'
        );
        expect(result.success).toBe(true);
        expect(scanFile).not.toHaveBeenCalled();
      });

      it('should invoke ClamAV scan for generic uploads (files/upload uses context "generic")', async () => {
        vi.mocked(scanFile).mockResolvedValueOnce({ isClean: true });
        vi.mocked(isClamAVEnabled).mockReturnValue(true);

        const buffer = createPdfBuffer(512);
        const result = await validateFileUpload(
          buffer,
          'report.pdf',
          'application/pdf',
          'generic'
        );
        expect(result.success).toBe(true);
        expect(scanFile).toHaveBeenCalledOnce();
      });

      it('should reject a generic upload when ClamAV detects malware (MALWARE_DETECTED, 403)', async () => {
        vi.mocked(scanFile).mockResolvedValueOnce({
          isClean: false,
          virusName: 'EICAR-Test',
        });
        vi.mocked(isClamAVEnabled).mockReturnValue(true);

        const buffer = createPdfBuffer(512);
        const result = await validateFileUpload(
          buffer,
          'infected.pdf',
          'application/pdf',
          'generic'
        );
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('MALWARE_DETECTED');
        expect(result.status).toBe(403);
      });
    });
  });
});