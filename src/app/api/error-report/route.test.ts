import { describe, it, expect } from 'vitest';

describe('error-report API', () => {
  it('accepts valid error report payload', async () => {
    const { POST } = await import('@/app/api/error-report/route');
    const req = new Request('http://localhost/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Something went wrong',
        digest: 'abc123',
        url: '/dashboard',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('rejects empty message', async () => {
    const { POST } = await import('@/app/api/error-report/route');
    const req = new Request('http://localhost/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
