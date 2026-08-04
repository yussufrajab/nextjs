import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(withRateLimit(withAuth(async (request) => {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'active';

  const where: { isActive?: boolean } = {};
  if (status === 'active') where.isActive = true;
  if (status === 'expired') where.isActive = false;
  // status === 'all' → no filter

  const [bans, total] = await Promise.all([
    db.ipBan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.ipBan.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: bans, total });
}, { allowedRoles: ['Admin'] }), 'read'), 'admin-ip-bans-list');