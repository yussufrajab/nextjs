import crypto from 'crypto';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Application-level PII encryption utilities.
 *
 * Uses PostgreSQL pgcrypto (pgp_sym_encrypt/pgp_sym_decrypt) for field-level
 * encryption of sensitive employee data. The encryption key is set as a runtime
 * configuration parameter per-session and never stored in the database.
 */

const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY;

function getEncryptionKey(): string {
  if (!ENCRYPTION_KEY) {
    throw new Error(
      'PII_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return ENCRYPTION_KEY;
}

/**
 * Set the encryption key for the current database session.
 * Must be called before any encrypt/decrypt operations.
 */
export async function initEncryptionSession(): Promise<void> {
  const key = getEncryptionKey();
  await db.$executeRawUnsafe(
    `SELECT set_config('app.encryption_key', $1, false)`,
    key
  );
}

/**
 * Encrypt a plaintext value using pgcrypto.
 * Returns base64-encoded ciphertext, or null if input is null.
 */
export async function encryptPII(plaintext: string | null): Promise<string | null> {
  if (plaintext === null) return null;
  const result = await db.$queryRawUnsafe<{ encrypted: string }[]>(
    `SELECT encrypt_pii($1) AS encrypted`,
    plaintext
  );
  return result[0]?.encrypted ?? null;
}

/**
 * Decrypt a base64-encoded ciphertext back to plaintext.
 * Returns null if input is null.
 */
export async function decryptPII(ciphertext: string | null): Promise<string | null> {
  if (ciphertext === null) return null;
  const result = await db.$queryRawUnsafe<{ decrypted: string }[]>(
    `SELECT decrypt_pii($1) AS decrypted`,
    ciphertext
  );
  return result[0]?.decrypted ?? null;
}

/**
 * Generate a cryptographically secure encryption key (256-bit).
 * Use this once to create the PII_ENCRYPTION_KEY value.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify the encryption setup is working correctly.
 * Returns true if encrypt/decrypt round-trip succeeds.
 */
export async function verifyEncryption(): Promise<boolean> {
  try {
    await initEncryptionSession();
    const testValue = 'encryption-test-' + Date.now();
    const encrypted = await encryptPII(testValue);
    if (!encrypted) return false;
    const decrypted = await decryptPII(encrypted);
    return decrypted === testValue;
  } catch (error) {
    logger.error({ err: error }, 'Encryption verification failed');
    return false;
  }
}
