import { NextRequest, NextResponse } from 'next/server';
import { withCSRFProtection } from '@/lib/api-csrf-middleware';

/**
 * Test endpoint for CSRF protection
 * This endpoint is only for testing CSRF token validation
 * Should be removed in production or protected by additional authentication
 */

// GET endpoint (should work without CSRF token - safe method)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'GET request successful - no CSRF token required for safe methods',
    data: {
      timestamp: new Date().toISOString(),
      method: 'GET',
      csrfRequired: false,
    },
  });
}

// POST endpoint (requires CSRF token)
export async function POST(req: Request) {
  // Validate CSRF token
  const csrfCheck = await withCSRFProtection(req);
  if (!csrfCheck.valid) {
    return csrfCheck.response!;
  }

  const body = await req.json();

  return NextResponse.json({
    success: true,
    message: 'POST request successful - CSRF token validated',
    data: {
      timestamp: new Date().toISOString(),
      method: 'POST',
      csrfRequired: true,
      receivedData: body,
    },
  });
}

// PUT endpoint (requires CSRF token)
export async function PUT(req: Request) {
  // Validate CSRF token
  const csrfCheck = await withCSRFProtection(req);
  if (!csrfCheck.valid) {
    return csrfCheck.response!;
  }

  const body = await req.json();

  return NextResponse.json({
    success: true,
    message: 'PUT request successful - CSRF token validated',
    data: {
      timestamp: new Date().toISOString(),
      method: 'PUT',
      csrfRequired: true,
      receivedData: body,
    },
  });
}

// DELETE endpoint (requires CSRF token)
export async function DELETE(req: Request) {
  // Validate CSRF token
  const csrfCheck = await withCSRFProtection(req);
  if (!csrfCheck.valid) {
    return csrfCheck.response!;
  }

  return NextResponse.json({
    success: true,
    message: 'DELETE request successful - CSRF token validated',
    data: {
      timestamp: new Date().toISOString(),
      method: 'DELETE',
      csrfRequired: true,
    },
  });
}
