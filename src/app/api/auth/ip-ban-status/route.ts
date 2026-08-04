import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getIpBanStatus } from '@/lib/ip-ban-utils';
import { withRateLimit } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

const querySchema = z.object({ ip: z.string().min(1, 'ip is required') });

export const GET = wrapHandler(withRateLimit(async (request) => {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ ip: url.searchParams.get('ip') });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }

  const status = await getIpBanStatus(parsed.data.ip);
  return NextResponse.json({ success: true, data: status });
}, 'read'), 'ip-ban-status');