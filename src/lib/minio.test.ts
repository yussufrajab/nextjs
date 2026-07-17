// Unit tests for object-key sanitation and path-traversal validation.
// These guard the Commission Response Letter retrieval flow: an uploaded file
// named "Suza certificate ..pdf" previously produced a key containing "..",
// which the retrieval guard rejected with HTTP 400.

import { describe, it, expect } from 'vitest';
import { generateObjectKey, sanitizeObjectName, isPathTraversal } from './minio';

describe('sanitizeObjectName', () => {
  it('collapses dot runs so ".." can never appear', () => {
    expect(sanitizeObjectName('Suza_certcfcate_..pdf')).toBe('Suza_certcfcate_pdf');
    expect(sanitizeObjectName('foo...bar.pdf')).toBe('foo_bar.pdf');
  });

  it('strips leading and trailing dots', () => {
    expect(sanitizeObjectName('.hidden.pdf')).toBe('hidden.pdf');
    expect(sanitizeObjectName('name.')).toBe('name');
  });

  it('replaces illegal characters with underscores', () => {
    expect(sanitizeObjectName('my file (1).pdf')).toBe('my_file_1_.pdf');
    expect(sanitizeObjectName('a/b\\c')).toBe('a_b_c');
  });

  it('keeps safe names intact', () => {
    expect(sanitizeObjectName('report-2024_v2.pdf')).toBe('report-2024_v2.pdf');
  });
});

describe('generateObjectKey', () => {
  it('never produces a key containing ".."', () => {
    const key = generateObjectKey('retirement/commission-letters', 'Suza certificate ..pdf');
    expect(key).not.toContain('..');
    expect(key.startsWith('retirement/commission-letters/')).toBe(true);
  });

  it('sanitizes the folder too', () => {
    const key = generateObjectKey('retirement/../secret', 'doc.pdf');
    expect(key).not.toContain('..');
  });
});

describe('isPathTraversal', () => {
  it('blocks genuine traversal sequences', () => {
    expect(isPathTraversal('/etc/passwd')).toBe(true);
    expect(isPathTraversal('../secret/file.pdf')).toBe(true);
    expect(isPathTraversal('folder/../../file.pdf')).toBe(true);
    expect(isPathTraversal('folder/..')).toBe(true);
    expect(isPathTraversal('folder/file\0.pdf')).toBe(true);
  });

  it('allows ".." embedded inside a filename (legacy keys)', () => {
    expect(isPathTraversal('retirement/commission-letters/1784264927641_fh6acz_Suza_certcfcate_..pdf')).toBe(false);
    expect(isPathTraversal('lwop/commission-letters/1784262903086_1p28ss_Suza_certcfcate_..pdf')).toBe(false);
  });

  it('allows normal keys', () => {
    expect(isPathTraversal('retirement/commission-letters/1752000000000_ab12cd_letter.pdf')).toBe(false);
  });
});
