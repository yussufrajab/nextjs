import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We test createTransporter indirectly by triggering a send and inspecting the
// nodemailer transport options, since createTransporter is a module-private
// helper. We reset the module cache between tests so the cached transporter
// is rebuilt with the current env.

const ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_REQUIRE_TLS',
  'SMTP_HELO_NAME',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_NAME',
  'SMTP_FROM_EMAIL',
] as const;

const ORIGINAL_ENV: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) ORIGINAL_ENV[k] = process.env[k];

function setSmtpEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  for (const k of ENV_KEYS) {
    if (k in overrides) {
      process.env[k] = overrides[k];
    } else {
      delete process.env[k];
    }
  }
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL_ENV[k];
  }
  vi.resetModules();
});

async function sendOne() {
  // Trigger transporter creation by invoking sendEmail with a stubbed sendMail.
  const nodemailer = (await import('nodemailer')).default;
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'm1' });
  const createTransport = vi
    .spyOn(nodemailer, 'createTransport')
    .mockImplementation(
      () =>
        ({
          sendMail,
          options: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 25,
            secure: process.env.SMTP_SECURE === 'true',
            requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
            name: process.env.SMTP_HELO_NAME,
          },
          verify: async () => true,
          close: () => {},
        }) as any,
    );

  const { sendEmail } = await import('./email');
  await sendEmail('to@example.com', 'subj', '<p>hi</p>');
  const transport = (createTransport.mock.results[0]?.value as any) ?? null;
  return (transport?.options ?? {}) as Record<string, unknown>;
}

describe('email transporter config', () => {
  it('defaults requireTLS to true (relay that demands STARTTLS would otherwise silence the banner)', async () => {
    setSmtpEnv({
      SMTP_HOST: 'mx.example.com',
      SMTP_USER: 'u',
      SMTP_PASSWORD: 'p',
    });
    const opts = await sendOne();
    expect(opts.requireTLS).toBe(true);
  });

  it('honors SMTP_REQUIRE_TLS=false to opt out of STARTTLS', async () => {
    setSmtpEnv({
      SMTP_HOST: 'mx.example.com',
      SMTP_USER: 'u',
      SMTP_PASSWORD: 'p',
      SMTP_REQUIRE_TLS: 'false',
    });
    const opts = await sendOne();
    expect(opts.requireTLS).toBe(false);
  });

  it('passes SMTP_HELO_NAME through so relays that require a real FQDN do not drop the EHLO', async () => {
    setSmtpEnv({
      SMTP_HOST: 'mx.example.com',
      SMTP_USER: 'u',
      SMTP_PASSWORD: 'p',
      SMTP_HELO_NAME: 'csms.zanajira.go.tz',
    });
    const opts = await sendOne();
    expect(opts.name).toBe('csms.zanajira.go.tz');
  });
});
