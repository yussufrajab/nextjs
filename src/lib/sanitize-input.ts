import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

/**
 * Server-side HTML sanitization utility for XSS prevention.
 *
 * Uses DOMPurify with jsdom to sanitize user-supplied strings before
 * storage or rendering. Strips all HTML tags and dangerous attributes
 * by default, producing plain text safe for embedding in any context.
 */

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Strict config: strip ALL HTML, keep only plain text.
const STRICT_CONFIG: Record<string, unknown> = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

// Rich-text config: allow a safe subset of formatting tags.
const RICH_TEXT_CONFIG: Record<string, unknown> = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'hr', 'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize a string by stripping all HTML tags and dangerous content.
 * Returns plain text safe for any rendering context.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const result = purify.sanitize(input, STRICT_CONFIG as any);
  return String(result).trim();
}

/**
 * Sanitize a string allowing a safe subset of HTML formatting tags.
 * Use only for fields that intentionally support rich text.
 */
export function sanitizeRichText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const result = purify.sanitize(input, RICH_TEXT_CONFIG as any);
  return String(result).trim();
}

/**
 * Sanitize all string values in a flat object.
 * Returns a new object with sanitized values.
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  mode: 'text' | 'richText' = 'text'
): T {
  const sanitizer = mode === 'richText' ? sanitizeRichText : sanitizeText;
  const result: Record<string, any> = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizer(result[key]);
    }
  }
  return result as T;
}

/**
 * Check if a string contains any HTML tags.
 * Useful for detecting potential XSS attempts before sanitization.
 */
export function containsHtml(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return /<[^>]*>/g.test(input);
}
