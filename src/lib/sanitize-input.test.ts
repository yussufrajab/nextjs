import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeRichText,
  sanitizeObject,
  containsHtml,
} from '@/lib/sanitize-input';

describe('sanitizeText', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World');
    expect(sanitizeText('John Doe')).toBe('John Doe');
  });

  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
    expect(sanitizeText('<p>Hello</p>')).toBe('Hello');
  });

  it('strips event handlers', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeText('<div onclick="alert(1)">click</div>')).toBe('click');
  });

  it('strips javascript: URLs', () => {
    const result = sanitizeText('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain('javascript:');
  });

  it('handles nested tags', () => {
    expect(sanitizeText('<div><p>nested <b>text</b></p></div>')).toBe('nested text');
  });

  it('handles encoded entities', () => {
    const result = sanitizeText('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result).not.toContain('<script>');
  });
});

describe('sanitizeRichText', () => {
  it('allows safe formatting tags', () => {
    const result = sanitizeRichText('<b>bold</b> and <i>italic</i>');
    expect(result).toContain('<b>bold</b>');
    expect(result).toContain('<i>italic</i>');
  });

  it('strips script tags even in rich text mode', () => {
    const result = sanitizeRichText('<b>safe</b><script>alert(1)</script>');
    expect(result).toContain('<b>safe</b>');
    expect(result).not.toContain('<script>');
  });

  it('allows safe links', () => {
    const result = sanitizeRichText('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
  });

  it('strips javascript: URLs from links', () => {
    const result = sanitizeRichText('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain('javascript:');
  });
});

describe('sanitizeObject', () => {
  it('sanitizes all string values', () => {
    const input = {
      name: '<script>alert(1)</script>John',
      email: 'john@example.com',
      age: 30,
      bio: '<b>Developer</b>',
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('John');
    expect(result.email).toBe('john@example.com');
    expect(result.age).toBe(30);
    expect(result.bio).toBe('Developer');
  });

  it('handles empty objects', () => {
    expect(sanitizeObject({})).toEqual({});
  });
});

describe('containsHtml', () => {
  it('detects HTML tags', () => {
    expect(containsHtml('<script>alert(1)</script>')).toBe(true);
    expect(containsHtml('<b>bold</b>')).toBe(true);
    expect(containsHtml('<img src=x>')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(containsHtml('Hello World')).toBe(false);
    expect(containsHtml('john@example.com')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(containsHtml('')).toBe(false);
    expect(containsHtml(null as any)).toBe(false);
  });
});
