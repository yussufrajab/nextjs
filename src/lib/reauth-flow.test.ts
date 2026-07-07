/**
 * Tests for the CLIENT step-up re-auth flow:
 *   - fetchWithReauth (src/lib/fetch-with-csrf.ts) — raw-fetch Tier-1 callers
 *   - ApiClient auto-reauth on REAUTH_REQUIRED (src/lib/api-client.ts)
 *
 * The reauth handler is registered in production by <ReauthProvider>; here we
 * register a mock handler via setReauthHandler to simulate the dialog.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithReauth } from './fetch-with-csrf';
import { setReauthHandler } from './reauth-client';
import { apiClient } from './api-client';

const CSRF_COOKIE = 'csrf-token=abc.def';

const jsonRes = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const REAUTH_BODY = {
  success: false,
  error: 'Re-authentication required for this action',
  errorCode: 'REAUTH_REQUIRED',
  requiredScope: 'admin.reset-password',
};

describe('fetchWithReauth', () => {
  beforeEach(() => {
    document.cookie = CSRF_COOKIE;
  });
  afterEach(() => {
    setReauthHandler(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reauths and retries once on 401 REAUTH_REQUIRED (handler succeeds)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(REAUTH_BODY, 401))
      .mockResolvedValueOnce(jsonRes({ success: true, data: { ok: 1 } }, 200));
    vi.stubGlobal('fetch', fetchMock);
    setReauthHandler(async () => true);

    const res = await fetchWithReauth('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('does NOT retry when the user cancels reauth (handler returns false)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes(REAUTH_BODY, 401));
    vi.stubGlobal('fetch', fetchMock);
    setReauthHandler(async () => false);

    const res = await fetchWithReauth('/api/admin/reset-password', {
      method: 'POST',
      body: '{}',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
  });

  it('passes a genuine 401 (no REAUTH_REQUIRED) through without calling reauth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes({ success: false, errorCode: 'INVALID_SESSION' }, 401)
    );
    vi.stubGlobal('fetch', fetchMock);
    const handler = vi.fn(async () => true);
    setReauthHandler(handler);

    const res = await fetchWithReauth('/api/admin/reset-password', {
      method: 'POST',
      body: '{}',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it('passes a successful response through untouched', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ success: true }, 200));
    vi.stubGlobal('fetch', fetchMock);
    const handler = vi.fn(async () => true);
    setReauthHandler(handler);

    const res = await fetchWithReauth('/api/whatever', { method: 'POST', body: '{}' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('does not loop: a second REAUTH_REQUIRED after retry is surfaced, not retried again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(REAUTH_BODY, 401))
      .mockResolvedValueOnce(jsonRes(REAUTH_BODY, 401)); // retry still denied
    vi.stubGlobal('fetch', fetchMock);
    setReauthHandler(async () => true);

    const res = await fetchWithReauth('/api/admin/reset-password', {
      method: 'POST',
      body: '{}',
    });

    // fetchWithReauth retries at most once → 2 calls total, then returns the 401.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(401);
  });
});

describe('ApiClient auto-reauth on REAUTH_REQUIRED', () => {
  beforeEach(() => {
    document.cookie = CSRF_COOKIE;
  });
  afterEach(() => {
    setReauthHandler(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reauths with the server-named scope and retries the original request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes(
          { success: false, errorCode: 'REAUTH_REQUIRED', requiredScope: 'users.delete', error: 'Reauth required' },
          401
        )
      )
      .mockResolvedValueOnce(jsonRes({ success: true, data: {} }, 200));
    vi.stubGlobal('fetch', fetchMock);
    const handler = vi.fn(async () => true);
    setReauthHandler(handler);

    const result = await apiClient.deleteUser('user-123');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith('users.delete');
    expect(result.success).toBe(true);
  });

  it('surfaces REAUTH_REQUIRED without clearing the session when reauth is cancelled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes(
        { success: false, errorCode: 'REAUTH_REQUIRED', requiredScope: 'users.delete', error: 'Reauth required' },
        401
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    setReauthHandler(async () => false);

    const result = await apiClient.deleteUser('user-123');

    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry
    expect(result.success).toBe(false);
    expect(result.code).toBe('REAUTH_REQUIRED');
  });
});