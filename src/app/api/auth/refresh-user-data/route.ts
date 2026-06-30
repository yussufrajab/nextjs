import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { getMePayload } from '@/lib/auth-me';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Refresh User Data API
 *
 * Returns the latest UI-safe user data from the database. Authenticated via
 * the signed `session` cookie (verifyAuth) — not the legacy auth-storage
 * cookie. Returns no password hashes or password history. Clients should
 * prefer GET /api/auth/me; this route is kept for compatibility and delegates
 * to the same safe payload.
 */
export const GET = wrapHandler(async (request: NextRequest) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    const response = NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  const payload = await getMePayload(authResult.context!.userId);
  if (!payload) {
    authLogger.warn({ userId: authResult.context!.userId }, 'refresh-user-data: user not found');
    const response = NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  const response = NextResponse.json({ success: true, data: payload });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}, 'auth-refresh-user-data');