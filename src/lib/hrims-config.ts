import { db } from '@/lib/db';

// Default HRIMS configuration
const DEFAULT_HRIMS_CONFIG = {
  host: '10.0.217.11',
  port: '8135',
  apiKey: '0ea1e3f5-ea57-410b-a199-246fa288b851',
  token:
    'CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4',
};

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
    console.error(`Error getting setting ${key}:`, error);
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
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
}

/**
 * Get the HRIMS configuration from the database
 * Falls back to defaults if not configured
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

  return {
    ...config,
    baseUrl: `http://${config.host}:${config.port}/api`,
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
