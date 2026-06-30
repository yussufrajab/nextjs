import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { getMePayload } from '@/lib/auth-me';
import { wrapHandler } from '@/lib/error-handler';

/**
 * Session endpoint — backend source of truth for client hydration.
 *
 * Authenticated via the signed `session` cookie (verifyAuth). Returns a
 * UI-safe payload (no password fields) or isAuthenticated:false. The legacy
 * auth-storage cookie is no longer read.
 */
export const GET = wrapHandler(async (request: NextRequest) => {
  const authResult = await verifyAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json({
      success: true,
      data: { isAuthenticated: false },
    });
  }

  const payload = await getMePayload(authResult.context!.userId);
  if (!payload) {
    return NextResponse.json({
      success: true,
      data: { isAuthenticated: false },
    });
  }

  return NextResponse.json({
    success: true,
    data: { isAuthenticated: true, ...payload },
  });
}, 'auth-session');