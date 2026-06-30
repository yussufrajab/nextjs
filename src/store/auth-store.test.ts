import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './auth-store';

const ME_PAYLOAD = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', email: 'yussuf.rajab@zanajira.go.tz', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1', institutionName: 'TUME YA UTUMISHI SERIKALINI',
  mustChangePassword: false, isTemporaryPassword: false,
  temporaryPasswordExpiry: null, lastPasswordChange: '2026-05-14T07:51:39.477Z',
};

describe('auth-store persistence + hydration', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    // Reset to the unauthenticated initial state. NOTE: the new AuthState only
    // has user, role, isAuthenticated — do NOT set removed fields here.
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does NOT write an auth-storage key to localStorage after login sets state', () => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Yussuf', username: 'ymrajab', role: 'Admin', active: true, institutionId: 'inst-1' } as any,
      role: 'Admin',
      isAuthenticated: true,
    });
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });

  it('initializeAuth hydrates authenticated state from /api/auth/me', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: ME_PAYLOAD }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('u1');
    expect(state.role).toBe('Admin');
    expect(state.user?.institutionName).toBe('TUME YA UTUMISHI SERIKALINI');
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });

  it('initializeAuth clears auth state on 401 from /api/auth/me', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'stale' } as any, role: 'Admin' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401 }));

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
  });

  it('initializeAuth clears a leftover legacy auth-storage localStorage key', async () => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user: { id: 'old' } } }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401 }));

    await useAuthStore.getState().initializeAuth();

    expect(localStorage.getItem('auth-storage')).toBeNull();
  });
});