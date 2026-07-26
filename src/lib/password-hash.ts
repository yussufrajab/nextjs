/**
 * Server-only password hashing utilities (Argon2id).
 *
 * This module imports the native `argon2` addon and MUST only be used from
 * server code (API routes, server actions, scripts). It must never be
 * imported by client components — doing so would pull a native C++ addon
 * (and `node:` builtins) into the browser bundle and break the build.
 *
 * Pure, client-safe password helpers (complexity, strength, temporary
 * password generation, lockout math) live in `./password-utils`.
 */

import argon2 from 'argon2';

// Argon2id parameters (OWASP baseline).
// memoryCost is in KiB (19456 = 19 MiB), timeCost = 2 iterations, parallelism = 1 lane.
// Override per-environment via env vars if the server is RAM/CPU constrained.
const ARGON2_MEMORY_COST = Number(process.env.ARGON2_MEMORY_COST) || 19456;
const ARGON2_TIME_COST = Number(process.env.ARGON2_TIME_COST) || 2;
const ARGON2_PARALLELISM = Number(process.env.ARGON2_PARALLELISM) || 1;

const argon2Options: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: ARGON2_MEMORY_COST,
  timeCost: ARGON2_TIME_COST,
  parallelism: ARGON2_PARALLELISM,
};

/**
 * Hash a password using Argon2id (OWASP baseline params, configurable via env).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argon2Options);
}

/**
 * Verify a password against an Argon2id hash.
 * Uses Argon2id only — no bcrypt fallback (testing environment, all hashes reset).
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Invalid/malformed hash → treat as no match rather than throwing.
    return false;
  }
}

/**
 * Compare a password with a hash.
 * Alias of {@link verifyPassword} kept for backward compatibility with
 * existing callers (login, reauth, change-password, etc.).
 */
export const comparePassword = verifyPassword;

/**
 * Check if password matches any in history.
 * Returns true if password matches any historical password (stored as Argon2id hashes).
 */
export async function checkPasswordHistory(
  password: string,
  passwordHistory: string[]
): Promise<boolean> {
  if (!passwordHistory || passwordHistory.length === 0) {
    return false; // No history, password is OK
  }

  for (const historicalHash of passwordHistory) {
    const matches = await verifyPassword(password, historicalHash);
    if (matches) {
      return true; // Password matches history
    }
  }

  return false; // Password doesn't match any historical password
}