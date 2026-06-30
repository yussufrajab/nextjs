import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getMePayload } from '@/lib/auth-me';
import { wrapHandler } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/auth/me — backend source of truth for client auth hydration.
 *
 * Authenticated via the signed `session` cookie (HttpOnly) through withAuth.
 * Returns only UI-safe user fields; never password hashes or password history.
 * The client calls this on page load instead of trusting persisted state.
 */
export const GET = wrapHandler(
  withAuth(async (_request: NextRequest | Request, { auth }) => {
    const payload = await getMePayload(auth.userId);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'User not found', errorCode: 'INVALID_SESSION' },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ success: true, data: payload });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }),
  'auth-me'
);