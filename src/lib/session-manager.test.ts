/**
 * Unit Tests for Session Manager
 *
 * Testing session creation, validation, termination, and cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSessionToken,
  calculateSessionExpiry,
  parseUserAgent,
  createSession,
  validateSession,
  terminateSession,
  terminateAllUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions,
  getUserSessionCount,
  MAX_CONCURRENT_SESSIONS,
  SESSION_EXPIRY_HOURS,
  SESSION_EXPIRY_MS,
} from './session-manager';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import the mocked db
import { db } from '@/lib/db';

// Type the mocked db methods (bypass Prisma type checking for test mocks)
const mockedDb = db as any;

describe('session-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // Constants
  // =============================================================================

  describe('Constants', () => {
    it('should have correct MAX_CONCURRENT_SESSIONS value', () => {
      expect(MAX_CONCURRENT_SESSIONS).toBe(3);
    });

    it('should have correct SESSION_EXPIRY_HOURS value', () => {
      expect(SESSION_EXPIRY_HOURS).toBe(24);
    });

    it('should have correct SESSION_EXPIRY_MS value', () => {
      expect(SESSION_EXPIRY_MS).toBe(24 * 60 * 60 * 1000);
    });
  });

  // =============================================================================
  // Token Generation
  // =============================================================================

  describe('generateSessionToken', () => {
    it('should generate a random session token', () => {
      const token = generateSessionToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex encoding)
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      const token3 = generateSessionToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate token with hex characters only', () => {
      const token = generateSessionToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  // =============================================================================
  // Session Expiry Calculation
  // =============================================================================

  describe('calculateSessionExpiry', () => {
    it('should calculate expiry date in the future', () => {
      const now = new Date();
      const expiry = calculateSessionExpiry();

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should set expiry to 24 hours from now', () => {
      const now = new Date();
      const expiry = calculateSessionExpiry();
      const diffMs = expiry.getTime() - now.getTime();

      // Allow for 1 second tolerance due to execution time
      expect(diffMs).toBeGreaterThanOrEqual(SESSION_EXPIRY_MS - 1000);
      expect(diffMs).toBeLessThanOrEqual(SESSION_EXPIRY_MS + 1000);
    });

    it('should return Date object', () => {
      const expiry = calculateSessionExpiry();
      expect(expiry).toBeInstanceOf(Date);
    });
  });

  // =============================================================================
  // User Agent Parsing
  // =============================================================================

  describe('parseUserAgent', () => {
    it('should return "Unknown Device" for null user agent', () => {
      expect(parseUserAgent(null)).toBe('Unknown Device');
    });

    it('should return "Unknown Device" for empty user agent', () => {
      expect(parseUserAgent('')).toBe('Unknown Device');
    });

    it('should detect mobile device', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1';
      expect(parseUserAgent(userAgent)).toBe('Mobile Device');
    });

    it('should detect tablet device', () => {
      const userAgent =
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Tablet Safari/604.1';
      expect(parseUserAgent(userAgent)).toBe('Tablet');
    });

    it('should detect Windows PC', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124';
      expect(parseUserAgent(userAgent)).toBe('Windows PC');
    });

    it('should detect Mac', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36';
      expect(parseUserAgent(userAgent)).toBe('Mac');
    });

    it('should detect Linux PC', () => {
      const userAgent =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/91.0.4472.124';
      expect(parseUserAgent(userAgent)).toBe('Linux PC');
    });

    it('should return "Unknown Device" for unrecognized user agent', () => {
      const userAgent = 'CustomBot/1.0';
      expect(parseUserAgent(userAgent)).toBe('Unknown Device');
    });

    it('should prioritize Mobile over other OS detection', () => {
      const userAgent =
        'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36';
      expect(parseUserAgent(userAgent)).toBe('Mobile Device');
    });
  });

  // =============================================================================
  // Session Creation
  // =============================================================================

  describe('createSession', () => {
    const userId = 'user-123';
    const ipAddress = '192.168.1.1';
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    it('should create a new session', async () => {
      const mockSession = {
        id: 'session-1',
        userId,
        sessionToken: 'token123',
        ipAddress,
        userAgent,
        deviceInfo: 'Windows PC',
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue([]);
      mockedDb.session.create.mockResolvedValue(mockSession);

      const session = await createSession(userId, ipAddress, userAgent);

      expect(session).toEqual(mockSession);
      expect(mockedDb.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          ipAddress,
          userAgent,
          deviceInfo: 'Windows PC',
          isSuspicious: false,
        }),
      });
    });

    it('should parse device info from user agent', async () => {
      const mockSession = {
        id: 'session-1',
        userId,
        sessionToken: 'token123',
        ipAddress,
        userAgent,
        deviceInfo: 'Windows PC',
        expiresAt: new Date(),
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue([]);
      mockedDb.session.create.mockResolvedValue(mockSession);

      await createSession(userId, ipAddress, userAgent);

      expect(mockedDb.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceInfo: 'Windows PC',
        }),
      });
    });

    it('should mark session as suspicious when specified', async () => {
      const mockSession = {
        id: 'session-1',
        userId,
        sessionToken: 'token123',
        ipAddress,
        userAgent,
        deviceInfo: 'Windows PC',
        expiresAt: new Date(),
        isSuspicious: true,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue([]);
      mockedDb.session.create.mockResolvedValue(mockSession);

      await createSession(userId, ipAddress, userAgent, true);

      expect(mockedDb.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSuspicious: true,
        }),
      });
    });

    it('should terminate oldest session when limit reached', async () => {
      const now = new Date();
      const oldSessions = [
        {
          id: 'session-1',
          userId,
          sessionToken: 'token1',
          createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 1000),
        },
        {
          id: 'session-2',
          userId,
          sessionToken: 'token2',
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 1000),
        },
        {
          id: 'session-3',
          userId,
          sessionToken: 'token3',
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 1000),
        },
      ];

      const mockNewSession = {
        id: 'session-4',
        userId,
        sessionToken: 'token4',
        ipAddress,
        userAgent,
        deviceInfo: 'Windows PC',
        expiresAt: new Date(),
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue(oldSessions as any);
      mockedDb.session.deleteMany.mockResolvedValue({ count: 1 });
      mockedDb.session.create.mockResolvedValue(mockNewSession);

      await createSession(userId, ipAddress, userAgent);

      expect(mockedDb.session.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['session-1'] }, // Oldest session
        },
      });
      expect(mockedDb.session.create).toHaveBeenCalled();
    });

    it('should not delete sessions when below limit', async () => {
      const oldSessions = [
        {
          id: 'session-1',
          userId,
          sessionToken: 'token1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 1000),
        },
      ];

      const mockNewSession = {
        id: 'session-2',
        userId,
        sessionToken: 'token2',
        ipAddress,
        userAgent,
        deviceInfo: 'Windows PC',
        expiresAt: new Date(),
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue(oldSessions as any);
      mockedDb.session.create.mockResolvedValue(mockNewSession);

      await createSession(userId, ipAddress, userAgent);

      expect(mockedDb.session.deleteMany).not.toHaveBeenCalled();
      expect(mockedDb.session.create).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockedDb.session.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(createSession(userId, ipAddress, userAgent)).rejects.toThrow(
        'DB Error'
      );
    });
  });

  // =============================================================================
  // Session Validation
  // =============================================================================

  describe('validateSession', () => {
    const sessionToken = 'valid-token-123';

    it('should return session if valid and not expired', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-123',
        sessionToken,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceInfo: 'Windows PC',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in future
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
        User: {
          id: 'user-123',
          username: 'testuser',
          role: 'HRO',
        },
      };

      mockedDb.session.findUnique.mockResolvedValue(mockSession as any);
      mockedDb.session.update.mockResolvedValue(mockSession as any);

      const session = await validateSession(sessionToken);

      expect(session).toEqual(mockSession);
      expect(mockedDb.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { lastActivity: expect.any(Date) },
      });
    });

    it('should return null if session not found', async () => {
      mockedDb.session.findUnique.mockResolvedValue(null);

      const session = await validateSession(sessionToken);

      expect(session).toBeNull();
    });

    it('should delete and return null if session expired', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-123',
        sessionToken,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceInfo: 'Windows PC',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour in past
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
        User: {
          id: 'user-123',
          username: 'testuser',
          role: 'HRO',
        },
      };

      mockedDb.session.findUnique.mockResolvedValue(mockSession as any);
      mockedDb.session.delete.mockResolvedValue(mockSession as any);

      const session = await validateSession(sessionToken);

      expect(session).toBeNull();
      expect(mockedDb.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should update lastActivity on successful validation', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-123',
        sessionToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        User: { id: 'user-123' },
      };

      mockedDb.session.findUnique.mockResolvedValue(mockSession as any);
      mockedDb.session.update.mockResolvedValue(mockSession as any);

      await validateSession(sessionToken);

      expect(mockedDb.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { lastActivity: expect.any(Date) },
      });
    });

    it('should return null on database error', async () => {
      mockedDb.session.findUnique.mockRejectedValue(new Error('DB Error'));

      const session = await validateSession(sessionToken);

      expect(session).toBeNull();
    });
  });

  // =============================================================================
  // Session Termination
  // =============================================================================

  describe('terminateSession', () => {
    const sessionToken = 'token-to-terminate';

    it('should terminate session successfully', async () => {
      mockedDb.session.delete.mockResolvedValue({
        id: 'session-1',
        sessionToken,
      } as any);

      const result = await terminateSession(sessionToken);

      expect(result).toBe(true);
      expect(mockedDb.session.delete).toHaveBeenCalledWith({
        where: { sessionToken },
      });
    });

    it('should return false on database error', async () => {
      mockedDb.session.delete.mockRejectedValue(new Error('DB Error'));

      const result = await terminateSession(sessionToken);

      expect(result).toBe(false);
    });
  });

  describe('terminateAllUserSessions', () => {
    const userId = 'user-123';

    it('should terminate all sessions for user', async () => {
      mockedDb.session.deleteMany.mockResolvedValue({ count: 3 });

      const count = await terminateAllUserSessions(userId);

      expect(count).toBe(3);
      expect(mockedDb.session.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return 0 if no sessions found', async () => {
      mockedDb.session.deleteMany.mockResolvedValue({ count: 0 });

      const count = await terminateAllUserSessions(userId);

      expect(count).toBe(0);
    });

    it('should return 0 on database error', async () => {
      mockedDb.session.deleteMany.mockRejectedValue(new Error('DB Error'));

      const count = await terminateAllUserSessions(userId);

      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // Get Active Sessions
  // =============================================================================

  describe('getUserActiveSessions', () => {
    const userId = 'user-123';

    it('should return active sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          sessionToken: 'token1',
          ipAddress: '192.168.1.1',
          deviceInfo: 'Windows PC',
          location: null,
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isSuspicious: false,
        },
        {
          id: 'session-2',
          sessionToken: 'token2',
          ipAddress: '192.168.1.2',
          deviceInfo: 'Mac',
          location: null,
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isSuspicious: false,
        },
      ];

      mockedDb.session.findMany.mockResolvedValue(mockSessions as any);

      const sessions = await getUserActiveSessions(userId);

      expect(sessions).toEqual(mockSessions);
      expect(mockedDb.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
        select: expect.objectContaining({
          id: true,
          sessionToken: true,
          ipAddress: true,
          deviceInfo: true,
        }),
      });
    });

    it('should return empty array if no active sessions', async () => {
      mockedDb.session.findMany.mockResolvedValue([]);

      const sessions = await getUserActiveSessions(userId);

      expect(sessions).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      mockedDb.session.findMany.mockRejectedValue(new Error('DB Error'));

      const sessions = await getUserActiveSessions(userId);

      expect(sessions).toEqual([]);
    });
  });

  // =============================================================================
  // Session Cleanup
  // =============================================================================

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      mockedDb.session.deleteMany.mockResolvedValue({ count: 5 });

      const count = await cleanupExpiredSessions();

      expect(count).toBe(5);
      expect(mockedDb.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should return 0 if no expired sessions', async () => {
      mockedDb.session.deleteMany.mockResolvedValue({ count: 0 });

      const count = await cleanupExpiredSessions();

      expect(count).toBe(0);
    });

    it('should return 0 on database error', async () => {
      mockedDb.session.deleteMany.mockRejectedValue(new Error('DB Error'));

      const count = await cleanupExpiredSessions();

      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // Session Count
  // =============================================================================

  describe('getUserSessionCount', () => {
    const userId = 'user-123';

    it('should return count of active sessions', async () => {
      mockedDb.session.count.mockResolvedValue(3);

      const count = await getUserSessionCount(userId);

      expect(count).toBe(3);
      expect(mockedDb.session.count).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it('should return 0 if no active sessions', async () => {
      mockedDb.session.count.mockResolvedValue(0);

      const count = await getUserSessionCount(userId);

      expect(count).toBe(0);
    });

    it('should return 0 on database error', async () => {
      mockedDb.session.count.mockRejectedValue(new Error('DB Error'));

      const count = await getUserSessionCount(userId);

      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle null IP address in createSession', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-123',
        sessionToken: 'token123',
        ipAddress: null,
        userAgent: 'Mozilla/5.0',
        deviceInfo: 'Unknown Device',
        expiresAt: new Date(),
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue([]);
      mockedDb.session.create.mockResolvedValue(mockSession);

      const session = await createSession('user-123', null, null);

      expect(session.ipAddress).toBeNull();
      expect(session.deviceInfo).toBe('Unknown Device');
    });

    it('should handle concurrent session limit exactly at MAX', async () => {
      const now = new Date();
      const exactlyMaxSessions = Array.from(
        { length: MAX_CONCURRENT_SESSIONS },
        (_, i) => ({
          id: `session-${i + 1}`,
          userId: 'user-123',
          sessionToken: `token${i + 1}`,
          createdAt: new Date(now.getTime() - (3 - i) * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 1000),
        })
      );

      const mockNewSession = {
        id: 'session-new',
        userId: 'user-123',
        sessionToken: 'new-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceInfo: 'Windows PC',
        expiresAt: new Date(),
        isSuspicious: false,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
      };

      mockedDb.session.findMany.mockResolvedValue(exactlyMaxSessions as any);
      mockedDb.session.deleteMany.mockResolvedValue({ count: 1 });
      mockedDb.session.create.mockResolvedValue(mockNewSession);

      await createSession('user-123', '192.168.1.1', 'Mozilla/5.0');

      expect(mockedDb.session.deleteMany).toHaveBeenCalled();
    });
  });
});
