import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Refresh User Data API
 * Fetches the latest user data from database and returns it
 * This helps fix stale auth states without requiring logout/login
 */

// Parse auth storage from cookie
function parseAuthStorage(cookieValue: string | undefined): {
  userId: string | null;
} {
  if (!cookieValue) {
    return { userId: null };
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    const authData = JSON.parse(decoded);
    const state = authData.state || authData;

    return {
      userId: state.user?.id || null,
    };
  } catch (error) {
    console.error('Failed to parse auth-storage cookie:', error);
    return { userId: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get auth from cookie
    const authCookie = request.cookies.get('auth-storage')?.value;
    const { userId } = parseAuthStorage(authCookie);

    if (!userId) {
      const response = NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
      // Prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        employeeId: true,
        institutionId: true,
        createdAt: true,
        updatedAt: true,
        passwordHistory: true,
        isTemporaryPassword: true,
        temporaryPasswordExpiry: true,
        mustChangePassword: true,
        lastPasswordChange: true,
        failedPasswordChangeAttempts: true,
        passwordChangeLockoutUntil: true,
      },
    });

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
      // Prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    // Get institution name if exists
    let institutionName = null;
    if (user.institutionId) {
      const institution = await prisma.institution.findUnique({
        where: { id: user.institutionId },
        select: { name: true },
      });
      institutionName = institution?.name || null;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        active: user.active,
        employeeId: user.employeeId,
        institutionId: user.institutionId,
        institutionName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        passwordHistory: user.passwordHistory,
        isTemporaryPassword: user.isTemporaryPassword,
        temporaryPasswordExpiry: user.temporaryPasswordExpiry,
        mustChangePassword: user.mustChangePassword,
        lastPasswordChange: user.lastPasswordChange,
        failedPasswordChangeAttempts: user.failedPasswordChangeAttempts,
        passwordChangeLockoutUntil: user.passwordChangeLockoutUntil,
      },
    });
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
}
