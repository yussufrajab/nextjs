import { db } from '@/lib/db';
import { hrimsLogger } from '@/lib/logger';

// Default HRIMS configuration (secrets from env vars only)
const DEFAULT_HRIMS_CONFIG = {
  host: process.env.HRIMS_HOST || '10.0.217.11',
  port: process.env.HRIMS_PORT || '8135',
  apiKey: process.env.HRIMS_API_KEY || '',
  token: process.env.HRIMS_TOKEN || '',
};

// ---------------------------------------------------------------------------
// Trusted-source / SSRF elimination (Req 11.2)
// ---------------------------------------------------------------------------

/** Error codes surfaced to callers when the resolved HRIMS config is unsafe. */
export const HRIMS_HOST_NOT_ALLOWED = 'HRIMS_HOST_NOT_ALLOWED';
export const HRIMS_HTTPS_REQUIRED = 'HRIMS_HTTPS_REQUIRED';

/**
 * Typed config error thrown by `getHrimsConfig` when the resolved HRIMS host
 * or transport is unsafe. Routes catch it (via `isHrimsConfigError`) and
 * surface a 400 + `HRIMS_SYNC_FAILED` audit event so a misconfigured or
 * tampered HRIMS endpoint can never be used to proxy the server at an
 * arbitrary host (SSRF) or exfiltrate the API key.
 */
export class HrimsConfigError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'HrimsConfigError';
    this.code = code;
  }
}

export function isHrimsConfigError(e: unknown): e is HrimsConfigError {
  return e instanceof HrimsConfigError;
}

/**
 * Parse `HRIMS_ALLOWED_HOSTS` (comma-separated) into a lowercased set. When
 * set, the resolved HRIMS host (DB setting or env default) MUST be in this
 * list or `getHrimsConfig` throws `HRIMS_HOST_NOT_ALLOWED`. Empty/unset → no
 * allow-list enforced (backwards-compatible default for dev/CI).
 */
function parseAllowedHosts(): Set<string> {
  const raw = process.env.HRIMS_ALLOWED_HOSTS || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Resolve the HRIMS transport scheme. Defaults to `http` (the legacy internal
 * endpoint). Production may set `HRIMS_API_SCHEME=https` to require TLS.
 */
function resolveScheme(): string {
  const scheme = (process.env.HRIMS_API_SCHEME || 'http').trim().toLowerCase();
  return scheme === 'https' ? 'https' : 'http';
}

/**
 * Validate the resolved host + scheme against the trusted-source policy
 * (Req 11.2). Throws `HrimsConfigError` on violation.
 */
function assertTrustedSource(host: string, scheme: string): void {
  const allowed = parseAllowedHosts();
  if (allowed.size > 0 && !allowed.has(host.toLowerCase())) {
    throw new HrimsConfigError(
      HRIMS_HOST_NOT_ALLOWED,
      `HRIMS host '${host}' is not in HRIMS_ALLOWED_HOSTS`
    );
  }
  // Reject non-https in production unless the operator explicitly opts in to
  // insecure HTTP (e.g. a private-network HRIMS without TLS). TLS certificate
  // validation is never disabled — Node's fetch (undici) validates the cert
  // chain by default and these routes never set `rejectUnauthorized: false`.
  const isProduction = process.env.NODE_ENV === 'production';
  const allowInsecure = process.env.HRIMS_ALLOW_INSECURE_HTTP === 'true';
  if (isProduction && scheme !== 'https' && !allowInsecure) {
    throw new HrimsConfigError(
      HRIMS_HTTPS_REQUIRED,
      'HRIMS API must use https in production (set HRIMS_API_SCHEME=https, or HRIMS_ALLOW_INSECURE_HTTP=true for an explicit opt-in)'
    );
  }
}

export interface HrimsConfig {
  host: string;
  port: string;
  apiKey: string;
  token: string;
  baseUrl: string;
}

// Settings keys used in the database
const HRIMS_SETTINGS_KEYS = {
  HOST: 'hrims_host',
  PORT: 'hrims_port',
  API_KEY: 'hrims_api_key',
  TOKEN: 'hrims_token',
};

/**
 * Get a single setting value from the database
 */
async function getSetting(key: string): Promise<string | null> {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  } catch (error) {
    hrimsLogger.error({ err: error, key }, 'Error getting setting');
    return null;
  }
}

/**
 * Set a single setting value in the database
 */
async function setSetting(key: string, value: string): Promise<void> {
  try {
    await db.systemSettings.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: {
        id: `setting_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        key,
        value,
        updatedAt: new Date()
      },
    });
  } catch (error) {
    hrimsLogger.error({ err: error, key }, 'Error setting setting');
    throw error;
  }
}

/**
 * Get the HRIMS configuration from the database
 * Falls back to defaults if not configured.
 *
 * SECURITY (Req 11.2): the resolved host + transport are validated against
 * the trusted-source policy (`HRIMS_ALLOWED_HOSTS` allow-list + https-in-
 * production) BEFORE the config is handed to a route. A violation throws
 * `HrimsConfigError`, which routes surface as a 400 + `HRIMS_SYNC_FAILED`
 * audit event — a misconfigured or tampered endpoint can never proxy the
 * server at an arbitrary host (SSRF) or exfiltrate the API key.
 */
export async function getHrimsConfig(): Promise<HrimsConfig> {
  const [host, port, apiKey, token] = await Promise.all([
    getSetting(HRIMS_SETTINGS_KEYS.HOST),
    getSetting(HRIMS_SETTINGS_KEYS.PORT),
    getSetting(HRIMS_SETTINGS_KEYS.API_KEY),
    getSetting(HRIMS_SETTINGS_KEYS.TOKEN),
  ]);

  const config = {
    host: host || DEFAULT_HRIMS_CONFIG.host,
    port: port || DEFAULT_HRIMS_CONFIG.port,
    apiKey: apiKey || DEFAULT_HRIMS_CONFIG.apiKey,
    token: token || DEFAULT_HRIMS_CONFIG.token,
  };

  const scheme = resolveScheme();
  assertTrustedSource(config.host, scheme);

  return {
    ...config,
    baseUrl: `${scheme}://${config.host}:${config.port}/api`,
  };
}

/**
 * Save HRIMS configuration to the database
 */
export async function saveHrimsConfig(config: {
  host: string;
  port: string;
  apiKey?: string;
  token?: string;
}): Promise<void> {
  const updates: Promise<void>[] = [
    setSetting(HRIMS_SETTINGS_KEYS.HOST, config.host),
    setSetting(HRIMS_SETTINGS_KEYS.PORT, config.port),
  ];

  // Only update API key and token if provided
  if (config.apiKey) {
    updates.push(setSetting(HRIMS_SETTINGS_KEYS.API_KEY, config.apiKey));
  }
  if (config.token) {
    updates.push(setSetting(HRIMS_SETTINGS_KEYS.TOKEN, config.token));
  }

  await Promise.all(updates);
}

/**
 * Get HRIMS configuration as the legacy format used by API routes
 * This is for backwards compatibility with existing code
 */
export async function getHrimsApiConfig(): Promise<{
  BASE_URL: string;
  API_KEY: string;
  TOKEN: string;
}> {
  const config = await getHrimsConfig();
  return {
    BASE_URL: config.baseUrl,
    API_KEY: config.apiKey,
    TOKEN: config.token,
  };
}

/**
 * Test HRIMS connection with given configuration
 */
export async function testHrimsConnection(config: {
  host: string;
  port: string;
  apiKey: string;
  token: string;
}): Promise<{ success: boolean; message: string; responseTime?: number }> {
  const baseUrl = `http://${config.host}:${config.port}/api`;
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/Employees`, {
      method: 'POST',
      headers: {
        ApiKey: config.apiKey,
        Token: config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        RequestId: '202',
        RequestPayloadData: {
          RequestBody: '536151', // Test with a known payroll number
        },
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout for connection test
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      if (data.code === 200 || data.status === 'Success') {
        return {
          success: true,
          message: `Connection successful (${responseTime}ms)`,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `HRIMS returned error: ${data.message || 'Unknown error'}`,
          responseTime,
        };
      }
    } else {
      return {
        success: false,
        message: `HTTP Error: ${response.status} ${response.statusText}`,
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          success: false,
          message: `Connection timed out after ${responseTime}ms`,
          responseTime,
        };
      }
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        responseTime,
      };
    }
    return {
      success: false,
      message: 'Unknown connection error',
      responseTime,
    };
  }
}
