import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

/**
 * Session endpoint — returns the current auth state from the server-set
 * httpOnly auth-storage cookie. Used by the client to hydrate the Zustand
 * auth store on page load without exposing the cookie to JavaScript.
 */
export const GET = wrapHandler(async (request: NextRequest) => {
    const cookie = request.cookies.get('auth-storage');

    if (!cookie?.value) {
      return NextResponse.json({
        success: true,
        data: { isAuthenticated: false },
      });
    }

    const decoded = decodeURIComponent(cookie.value);
    const authData = JSON.parse(decoded);

    // New server-set format
    if (authData.userId && authData.role) {
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: authData.isAuthenticated === true,
          userId: authData.userId,
          role: authData.role,
          username: authData.username,
          institutionId: authData.institutionId,
        },
      });
    }

    // Legacy format fallback
    const state = authData.state || authData;
    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: state.isAuthenticated === true,
        userId: state.user?.id || null,
        role: state.role || state.user?.role || null,
        username: state.user?.username || null,
        institutionId: state.user?.institutionId || null,
      },
    });
}, 'auth-session');
