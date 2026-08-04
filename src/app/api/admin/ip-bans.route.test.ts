import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    ipBan: {
      findMany: vi.fn().mockResolvedValue([
        { ipAddress: '203.0.113.9', isActive: true, banType: 'security', banCount: 4, banReason: 'failed_logins', bannedUntil: null, isManuallyBanned: false, bannedBy: null, bannedAt: null, banNotes: null },
      ]),
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));
vi.mock('@/lib/ip-ban-utils', () => ({
  getIpBanStatus: vi.fn().mockResolvedValue({
    isBanned: true, banType: 'security', banReason: 'failed_logins',
    remainingMinutes: 0, canAutoUnban: false, isManuallyBanned: false,
    bannedBy: null, bannedAt: null, banNotes: null,
  }),
}));
vi.mock('@/lib/api-auth', () => ({ withAuth: vi.fn((h: any) => h) }));
vi.mock('@/lib/rate-limiter', () => ({ withRateLimit: vi.fn((h: any) => h) }));
vi.mock('@/lib/error-handler', () => ({ wrapHandler: vi.fn((h: any) => h) }));

import { GET as listGet } from './ip-bans/route';
import { GET as statusGet } from '../auth/ip-ban-status/route';
import { db } from '@/lib/db';
import { getIpBanStatus } from '@/lib/ip-ban-utils';
import { NextRequest } from 'next/server';

const BAN_ROW = {
  ipAddress: '203.0.113.9', isActive: true, banType: 'security', banCount: 4,
  banReason: 'failed_logins', bannedUntil: null, isManuallyBanned: false,
  bannedBy: null, bannedAt: null, banNotes: null,
};

const BAN_STATUS = {
  isBanned: true, banType: 'security', banReason: 'failed_logins',
  remainingMinutes: 0, canAutoUnban: false, isManuallyBanned: false,
  bannedBy: null, bannedAt: null, banNotes: null,
};

describe('GET /api/admin/ip-bans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.ipBan.findMany as any).mockResolvedValue([BAN_ROW]);
    (db.ipBan.count as any).mockResolvedValue(1);
  });

  it('lists bans filtered by status=active', async () => {
    const req = new NextRequest('http://localhost/api/admin/ip-bans?status=active');
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ipAddress).toBe('203.0.113.9');
    expect((db.ipBan.findMany as any).mock.calls[0][0].where.isActive).toBe(true);
  });
});

describe('GET /api/auth/ip-ban-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getIpBanStatus as any).mockResolvedValue(BAN_STATUS);
  });

  it('returns status for the requested IP', async () => {
    const req = new NextRequest('http://localhost/api/auth/ip-ban-status?ip=203.0.113.9');
    const res = await statusGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isBanned).toBe(true);
  });

  it('rejects a missing ip with 400', async () => {
    const req = new NextRequest('http://localhost/api/auth/ip-ban-status');
    const res = await statusGet(req);
    expect(res.status).toBe(400);
  });
});