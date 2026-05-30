import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authLogger } from '@/lib/logger';

/**
 * Application error with optional HTTP status code and error code.
 * Throw this from any API route to produce a safe, structured error response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Standardized API error response shape.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
}

/**
 * Wrap an API route handler to catch errors and return safe, generic responses.
 * In production, internal error details are never exposed to the client.
 *
 * Usage:
 *   export const GET = withErrorHandler(async (request) => { ... });
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: string,
): T {
  const component = context || 'api';
  const logger = authLogger.child({ component });

  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      const isProduction = process.env.NODE_ENV === 'production';

      // AppError: intentional, safe to expose its message
      if (error instanceof AppError) {
        logger.warn({ err: error, errorCode: error.errorCode }, 'AppError caught');
        return NextResponse.json(
          {
            success: false,
            message: error.message,
            errorCode: error.errorCode,
            ...(error.details ? { details: error.details } : {}),
          },
          { status: error.statusCode },
        );
      }

      // ZodError: validation failure — expose field-level messages
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Validation failed',
            errorCode: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      // Unknown error: log the real error, return generic message
      logger.error({ err: error }, 'Unhandled API error');

      return NextResponse.json(
        {
          success: false,
          message: isProduction ? 'Internal Server Error' : `Internal Server Error — ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'INTERNAL_ERROR',
        },
        { status: 500 },
      );
    }
  }) as T;
}

/**
 * Generic error-catching wrapper that adapts to any handler signature.
 * Catches errors from the inner handler AND any middleware that runs before it
 * (withAuth, withCSRF, etc.) since it's the outermost layer in the chain.
 *
 * Usage — wrap at the outermost level:
 *   export const GET = wrapHandler(withRateLimit(withAuth(async (req, { auth }) => {
 *     // ... handler logic — errors are caught automatically
 *   }), 'read'), 'employees');
 *
 * For unauthenticated routes:
 *   export const POST = wrapHandler(withRateLimit(async (req) => {
 *     // ...
 *   }, 'auth'), 'auth-login');
 */
export function wrapHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: string,
): T {
  return withErrorHandler(handler, context) as unknown as T;
}

/**
 * Standalone function to produce a safe error response from a caught error.
 * Use when you need to handle errors inside a handler body (not at the top level).
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = authLogger.child({ component: context || 'api' });

  if (error instanceof AppError) {
    logger.warn({ err: error, errorCode: error.errorCode }, 'AppError caught');
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        errorCode: error.errorCode,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  logger.error({ err: error }, 'Unhandled API error');

  return NextResponse.json(
    {
      success: false,
      message: isProduction ? 'Internal Server Error' : `Internal Server Error — ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INTERNAL_ERROR',
    },
    { status: 500 },
  );
}
