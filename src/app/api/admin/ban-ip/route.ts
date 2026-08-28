import { NextResponse } from 'next/server';
import { z } from 'zod';
import { banIpManually } from '@/lib/ip-ban-utils';
import { getClientIp } from '@/lib/audit-logger';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const banIpSchema = z.object({
  ipAddress: z.string().min(1, 'IP address is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  notes: z.string().optional(),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  // Step-up re-authentication: manually banning an IP is a Tier-1
  // sensitive action.
  const denied = requireReauth(request, 'admin.ban-ip', auth);
  if (denied) return denied;

  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) return csrfCheck.response!;

  const body = await request.json();
  const parsed = banIpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }
  const { ipAddress, reason, notes } = parsed.data;

  const adminId = auth.userId;
  const clientIp = getClientIp(request.headers);

  await banIpManually(ipAddress, adminId, reason, notes);

  logger.info(
    `IP ${ipAddress} banned by admin ${auth.username} from ${clientIp}`
  );

  return NextResponse.json({
    success: true,
    message: 'IP banned successfully',
    data: { ipAddress, reason, bannedBy: auth.username },
  });
}, { allowedRoles: ['Admin'] }), 'write'), 'admin-ban-ip');