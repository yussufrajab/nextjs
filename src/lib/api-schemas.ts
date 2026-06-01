/**
 * API Validation Schemas & Request Validator
 *
 * Provides Zod schemas for validating API request bodies and query parameters,
 * plus a generic `validateRequest` helper that parses incoming NextRequest
 * objects and returns either validated data or a ready-to-send error response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodType } from 'zod';
import { sanitizeText } from '@/lib/sanitize-input';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ValidationResultSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationResultFailure = {
  success: false;
  response: NextResponse;
};

export type ValidationResult<T> = ValidationResultSuccess<T> | ValidationResultFailure;

// ---------------------------------------------------------------------------
// validateRequest
// ---------------------------------------------------------------------------

/**
 * Validate an incoming NextRequest against a Zod schema.
 *
 * @param request - The incoming Next.js request object
 * @param schema  - A Zod schema to validate against
 * @param source  - Where to read data from: `'body'` (JSON body) or `'query'` (URL search params)
 * @returns A discriminated union – `{ success: true, data }` or `{ success: false, response }`
 */
export async function validateRequest<T extends ZodType>(
  request: NextRequest,
  schema: T,
  source: 'body' | 'query' = 'body',
): Promise<ValidationResult<z.infer<T>>> {
  let input: unknown;

  try {
    if (source === 'query') {
      const params = new URL(request.url).searchParams;
      input = Object.fromEntries(params.entries());
    } else {
      input = await request.json();
    }
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 },
      ),
    };
  }

  try {
    const parsed = schema.parse(input);

    // Sanitize all string fields in the parsed data to prevent stored XSS
    const sanitized = sanitizeStrings(parsed);

    return { success: true, data: sanitized };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errorCode: 'VALIDATION_ERROR',
            details: err.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 },
        ),
      };
    }

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 },
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  institutionId: z.string().optional(),
  status: z.string().optional(),
});

export const employeeSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const fileUploadQuerySchema = z.object({
  folder: z.string().max(100).optional(),
});

export const notificationQuerySchema = z.object({
  userId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationCreateSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'success', 'error']).default('info'),
});

export const dashboardMetricsSchema = z.object({
  userRole: z.string().optional(),
  institutionId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// XSS Sanitization Helper
// ---------------------------------------------------------------------------

/**
 * Recursively sanitize all string values in an object to prevent stored XSS.
 * Uses DOMPurify to strip HTML tags and dangerous content from all strings.
 */
function sanitizeStrings<T>(data: T): T {
  if (typeof data === 'string') {
    return sanitizeText(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeStrings(item)) as unknown as T;
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeStrings(value);
    }
    return result as unknown as T;
  }
  return data;
}