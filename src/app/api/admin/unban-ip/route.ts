import { NextResponse } from 'next/server';
import { z } from 'zod';
import { unbanIp } from '@/lib/ip-ban-utils';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const unbanIpSchema = z.object({
  ipAddress: z.string().min(1, 'IP address is required'),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  // Step-up re-authentication: manually unbanning an IP is a Tier-1
  // sensitive action.
  const denied = requireReauth(request, 'admin.unban-ip', auth);
  if (denied) return denied;

  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) return csrfCheck.response!;

  const body = await request.json();
  const parsed = unbanIpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }
  const { ipAddress, notes } = parsed.data;

  const adminId = auth.userId;
  await unbanIp(ipAddress, adminId, notes);

  logger.info(`IP ${ipAddress} unbanned by admin ${auth.username}`);

  return NextResponse.json({
    success: true,
    message: 'IP unbanned successfully',
    data: { ipAddress, unbannedBy: auth.username },
  });
}, { allowedRoles: ['Admin'] }), 'write'), 'admin-unban-ip');