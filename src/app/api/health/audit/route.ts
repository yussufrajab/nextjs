import { NextResponse } from 'next/server';
import { checkAuditHealth } from '@/lib/audit-health';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

export const GET = wrapHandler(withAuth(async () => {
  const health = await checkAuditHealth();

  const statusCode =
    health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}, { allowedRoles: ['Admin', 'CSCS'] }), 'health-audit');
