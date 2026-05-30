import { describe, it, expect } from 'vitest';
import { AppError, handleApiError, wrapHandler } from '@/lib/error-handler';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

describe('AppError', () => {
  it('creates an error with status code and error code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
  });

  it('defaults to 500 and INTERNAL_ERROR', () => {
    const err = new AppError('Something broke');
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('handleApiError', () => {
  it('returns AppError details to client', async () => {
    const err = new AppError('Resource not found', 404, 'NOT_FOUND');
    const res = handleApiError(err);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Resource not found');
    expect(body.errorCode).toBe('NOT_FOUND');
  });

  it('returns Zod validation errors', async () => {
    let zodErr: ZodError | null = null;
    try {
      z.object({ name: z.string() }).parse({ name: 123 });
    } catch (e) {
      zodErr = e as ZodError;
    }

    const res = handleApiError(zodErr!);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
  });

  it('returns generic message for unknown errors', async () => {
    const res = handleApiError(new Error('Database connection refused'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_ERROR');
    // In test env (not production), message includes the error detail
    expect(body.message).toContain('Internal Server Error');
  });

  it('handles non-Error thrown values', async () => {
    const res = handleApiError('just a string');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('wrapHandler', () => {
  it('wraps a simple handler and catches errors', async () => {
    const handler = wrapHandler(async (_req: Request): Promise<NextResponse> => {
      throw new Error('boom');
    });
    const res = await handler(new Request('http://localhost/api/test'));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_ERROR');
  });

  it('passes arguments through to the inner handler', async () => {
    const inner = async (req: Request, ctx: { auth: { userId: string } }) => {
      return new NextResponse(JSON.stringify({ userId: ctx.auth.userId }), { status: 200 });
    };
    const handler = wrapHandler(inner);
    const req = new Request('http://localhost/api/test');
    const res = await handler(req, { auth: { userId: 'user-1' } });
    const body = await res.json();
    expect(body.userId).toBe('user-1');
  });

  it('returns AppError responses with correct status', async () => {
    const handler = wrapHandler(async (_req: Request): Promise<NextResponse> => {
      throw new AppError('Not found', 404, 'NOT_FOUND');
    });
    const res = await handler(new Request('http://localhost/api/test'));
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.errorCode).toBe('NOT_FOUND');
  });

  it('works as outermost wrapper around composed middleware', async () => {
    // Simulate withAuth-like middleware that throws
    const withFakeAuth = (handler: any) => async (req: Request) => {
      return handler(req, { auth: { userId: 'u1' } });
    };
    const inner = withFakeAuth(async (_req: Request, _ctx: any) => {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    });
    const handler = wrapHandler(inner, 'test');
    const res = await handler(new Request('http://localhost/api/test'));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.errorCode).toBe('FORBIDDEN');
  });
});
