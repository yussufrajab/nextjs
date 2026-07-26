/**
 * Fuzzy duplicate detection for employee creation (Req 6.5).
 *
 * The exact-match uniqueness checks on `zanId` / `zssfNumber` / `payrollNumber`
 * (Req 6.2–6.4) only catch the same identifier being re-keyed. They miss the
 * common data-entry duplicate where an HRO re-creates the same person with a
 * fresh (or mistyped) identifier — same human, same date of birth, same
 * institution, near-identical name — but no colliding key.
 *
 * Closing the gap: this module adds a name + DOB + institutionId duplicate
 * check. It is the *complement* to the exact-key checks, not a replacement:
 *
 *   - institutionId: exact (an institution's scope — CSC central access still
 *     creates per-institution, never cross-institution duplicates here).
 *   - dateOfBirth: exact calendar-day match (strong discriminator; cheapens the
 *     DB query to a small candidate set).
 *   - name: normalized Levenshtein similarity ≥ threshold.
 *
 * The DB query is scoped to `institutionId` + the DOB calendar day, so the
 * candidate set is tiny and the O(n·m) Levenshtein over short names is
 * negligible. Dependency-injected (`client`) so it can be unit-tested with a
 * mock and used from both the manual-entry and bulk-upload routes, each of
 * which holds its own PrismaClient instance.
 *
 * This is intentionally a *block* (409 / per-row error), consistent with the
 * exact-key checks: employee-creation integrity is a security control, and a
 * likely-duplicate record is surfaced with the existing record's zanId so the
 * HRO can verify before re-attempting.
 */

import type { PrismaClient } from '@prisma/client';
import { parseISODate } from './employee-field-validation';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/**
 * Normalized name similarity at/above which two records in the same
 * institution with the same date of birth are treated as a duplicate.
 *
 * `1 - levenshtein(a,b) / max(|a|,|b|)` after normalization. 0.85 catches
 * single-character typos and transliteration variants ("Mohammed" vs
 * "Mohammad") while comfortably rejecting unrelated names of similar length.
 */
export const DUPLICATE_NAME_SIMILARITY_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Name normalization & similarity
// ---------------------------------------------------------------------------

/**
 * Normalize a name for fuzzy comparison: lowercase, strip non-alphanumeric
 * characters (so "O'Brien" ≡ "OBrien", "Jane D. Doe" ≡ "Jane D Doe"), and
 * collapse internal whitespace. Empty input maps to empty string.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classic iterative Levenshtein edit distance. O(a·b) time, O(b) space.
 * Names are capped at 200 chars by the route validators, so this is cheap.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Normalized name similarity in [0,1]: `1 - distance / max(|a|,|b|)` over the
 * normalized forms. Two identical names → 1; completely different names of
 * equal length → 0. Empty/empty → 1 (two missing names are not a duplicate
 * signal on their own, but the caller already requires a non-empty name).
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ---------------------------------------------------------------------------
// DOB day bounds
// ---------------------------------------------------------------------------

/**
 * Build a UTC [start-of-day, start-of-next-day) range for a `YYYY-MM-DD` DOB
 * so the Prisma query matches any stored timestamp on that calendar day
 * regardless of how the source stored the time component. Returns null for
 * an unparseable date (caller skips the fuzzy check in that case).
 */
export function dobDayBounds(
  dateOfBirth: string | null | undefined
): { gte: Date; lt: Date } | null {
  const d = parseISODate(dateOfBirth);
  if (!d) return null;
  const gte = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ExistingEmployeeRef {
  id: string;
  name: string;
  zanId: string;
}

export interface FuzzyDuplicateResult {
  duplicate: boolean;
  similarity: number;
  existing?: ExistingEmployeeRef;
}

export interface FuzzyDuplicateInput {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  institutionId: string;
  /** Exclude this employee id from the candidate set (self-match guard). */
  excludeId?: string;
}

// ---------------------------------------------------------------------------
// DB-backed duplicate check (manual-entry + bulk-upload against existing rows)
// ---------------------------------------------------------------------------

/**
 * Minimal structural type for the Prisma client surface this module needs.
 * Kept loose so a plain mock satisfies it in tests.
 */
interface EmployeeFindManyClient {
  employee: {
    findMany: (args: any) => Promise<Array<{ id: string; name: string; zanId: string }>>;
  };
}

/**
 * Query the DB for an existing employee in the same institution, born on the
 * same calendar day, whose normalized name similarity to `input.name` is at
 * or above `DUPLICATE_NAME_SIMILARITY_THRESHOLD`. Returns the best (highest-
 * similarity) match, or `{ duplicate: false }` if none.
 *
 * If `institutionId` is missing or `dateOfBirth` does not parse, no fuzzy
 * check can be performed against the spec (name+DOB+institution) and the
 * function returns `{ duplicate: false }` — the exact-key checks still run
 * independently in the route.
 */
export async function findFuzzyDuplicate(
  client: PrismaClient | EmployeeFindManyClient,
  input: FuzzyDuplicateInput
): Promise<FuzzyDuplicateResult> {
  if (!input.institutionId) return { duplicate: false, similarity: 0 };
  const bounds = dobDayBounds(input.dateOfBirth);
  if (!bounds) return { duplicate: false, similarity: 0 };
  if (!normalizeName(input.name)) return { duplicate: false, similarity: 0 };

  const where: any = {
    institutionId: input.institutionId,
    dateOfBirth: { gte: bounds.gte, lt: bounds.lt },
  };
  if (input.excludeId) where.NOT = { id: input.excludeId };

  const candidates = await client.employee.findMany({
    where,
    select: { id: true, name: true, zanId: true },
  });

  let best: { similarity: number; existing: ExistingEmployeeRef } | null = null;
  for (const c of candidates) {
    const similarity = nameSimilarity(input.name, c.name);
    if (similarity >= DUPLICATE_NAME_SIMILARITY_THRESHOLD) {
      if (!best || similarity > best.similarity) {
        best = {
          similarity,
          existing: { id: c.id, name: c.name, zanId: c.zanId },
        };
      }
    }
  }

  if (!best) return { duplicate: false, similarity: 0 };
  return { duplicate: true, similarity: best.similarity, existing: best.existing };
}

// ---------------------------------------------------------------------------
// Within-file duplicate check (bulk-upload rows against each other)
// ---------------------------------------------------------------------------

/**
 * In-batch fuzzy duplicate: detects two rows in the same upload that are the
 * same person (same DOB + similar name) but were given different identifiers
 * (a re-key within the file). `dateOfBirth` is required on both rows by the
 * route, and institutionId is forced from the session for every row, so the
 * within-file comparison only needs DOB + name.
 *
 * Returns true if `b` is a fuzzy duplicate of an earlier `a`. The caller
 * keeps a running list of seen {name, dob} pairs and passes the prior rows.
 */
export function isWithinFileFuzzyDuplicate(
  current: { name: string; dateOfBirth: string },
  priorRows: Array<{ name: string; dateOfBirth: string }>
): { duplicate: boolean; similarity: number } {
  for (const prior of priorRows) {
    // Exact DOB calendar-day match is the strong gate; compare only dates
    // that parse to the same UTC calendar day.
    const a = parseISODate(prior.dateOfBirth);
    const b = parseISODate(current.dateOfBirth);
    if (!a || !b) continue;
    if (
      a.getUTCFullYear() !== b.getUTCFullYear() ||
      a.getUTCMonth() !== b.getUTCMonth() ||
      a.getUTCDate() !== b.getUTCDate()
    ) {
      continue;
    }
    const similarity = nameSimilarity(current.name, prior.name);
    if (similarity >= DUPLICATE_NAME_SIMILARITY_THRESHOLD) {
      return { duplicate: true, similarity };
    }
  }
  return { duplicate: false, similarity: 0 };
}