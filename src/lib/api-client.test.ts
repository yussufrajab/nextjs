import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './api-client';

describe('ApiClient auth transport', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not read or write accessToken in localStorage on construction', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem');
    apiClient.clearToken();
    apiClient.setToken('whatever');
    // Assert before any direct localStorage.getItem reads in the test body,
    // since those would themselves register on the prototype spy.
    expect(spy).not.toHaveBeenCalledWith('accessToken');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('sends no Authorization header on requests (cookie-based auth)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    await apiClient.get('/ping');
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Authorization')).toBe(false);
    expect(init?.credentials).toBe('include');
  });

  it('clearToken does not throw and leaves localStorage empty', () => {
    expect(() => apiClient.clearToken()).not.toThrow();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});