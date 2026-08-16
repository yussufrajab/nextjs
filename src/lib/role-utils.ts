/**
 * Utility functions for role-based access control
 */

// CSC internal roles that should see ALL institutions data
// Note: Admin is NOT included - Admin role is limited to system administration only
export const CSC_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS'];

/**
 * Determines if a user role should have access to all institutions data
 * @param userRole - The user's role
 * @returns true if the role should see all institutions data
 */
export function isCSCRole(userRole: string | null): boolean {
  return userRole ? CSC_ROLES.includes(userRole) : false;
}

/**
 * Determines if institution filtering should be applied for a given role
 * @param userRole - The user's role
 * @param userInstitutionId - The user's institution ID
 * @returns true if institution filtering should be applied
 */
export function shouldApplyInstitutionFilter(
  userRole: string | null,
  userInstitutionId: string | null
): boolean {
  if (!userRole || !userInstitutionId) return false;
  return !isCSCRole(userRole);
}

// ---------------------------------------------------------------------------
// Pemba-scoped role helpers
//
// hro_pemba / hrrp_pemba behave like HRO / HRRP but are additionally restricted
// to employees whose `island` column is 'PEMBA'. These predicates let call
// sites treat the regular + pemba variants together (`isHroLike`/`isHrrpLike`)
// without hand-copying the role strings, and let the pemba-only behaviour key
// off `isPembaScopedRole`.
// ---------------------------------------------------------------------------

/** Roles that behave as HRO (full institution scope) or its Pemba-scoped variant. */
export const HRO_LIKE_ROLES = ['HRO', 'HRO_PEMBA'] as const;
/** Roles that behave as HRRP (full institution scope) or its Pemba-scoped variant. */
export const HRRP_LIKE_ROLES = ['HRRP', 'HRRP_PEMBA'] as const;

export function isHroLike(role: string | null | undefined): boolean {
  return !!role && (HRO_LIKE_ROLES as readonly string[]).includes(role);
}

export function isHrrpLike(role: string | null | undefined): boolean {
  return !!role && (HRRP_LIKE_ROLES as readonly string[]).includes(role);
}

/** The Pemba-scoped variants specifically (NOT HRO/HRRP themselves). */
export const PEMBA_SCOPED_ROLES = ['HRO_PEMBA', 'HRRP_PEMBA'] as const;

export function isPembaScopedRole(role: string | null | undefined): boolean {
  return !!role && (PEMBA_SCOPED_ROLES as readonly string[]).includes(role);
}

/**
 * Appends the Pemba-scoped variant(s) to a role list, deduped
 * case-insensitively. Use to extend `allowedRoles` arrays:
 * `appendPembaRoles(['HRO','HRRP'])` → `['HRO','HRRP','HRO_PEMBA','HRRP_PEMBA']`.
 * `which:'hro'` appends only HRO_PEMBA; `'hrrp'` only HRRP_PEMBA; default both.
 */
export function appendPembaRoles(
  roles: readonly string[],
  which: 'hro' | 'hrrp' | 'both' = 'both'
): string[] {
  const add: string[] = [];
  if (which !== 'hrrp') add.push('HRO_PEMBA');
  if (which !== 'hro') add.push('HRRP_PEMBA');
  const seen = new Set(roles.map((r) => r.toUpperCase()));
  const out = [...roles];
  for (const r of add) {
    if (!seen.has(r.toUpperCase())) out.push(r);
  }
  return out;
}

/**
 * A where-fragment that scopes employees to the Pemba island when the role is
 * Pemba-scoped, else an empty object (no filtering). Spread into a Prisma
 * `where` the caller already constrains by `institutionId`.
 *
 * This uses the indexed `island` column (exact match) — the replacement for
 * the previous `department ILIKE '%pemba%'` full scan. The `island` value is
 * derived during HRIMS sync by `deriveIsland()` (src/lib/island-utils.ts).
 *
 * Kept as a plain object (not typed `Prisma.EmployeeWhereInput`) so this
 * module stays free of a `@prisma/client` import; the shape matches what
 * Prisma expects for `island` (an enum equality filter).
 */
export function pembaIslandWhere(
  role: string | null | undefined
): { island?: 'PEMBA' } {
  return isPembaScopedRole(role) ? { island: 'PEMBA' } : {};
}

/**
 * True when the loaded employee row is Pemba-scoped. For Pemba-scoped roles
 * this is the single-record IDOR gate (the list-query equivalent is
 * `pembaIslandWhere`). Reads the persisted `island` column — the indexed
 * source of truth set during HRIMS sync / manual entry / backfill.
 */
export function isPembaEmployee(
  employee: { island?: string | null } | null | undefined
): boolean {
  return !!employee && employee.island === 'PEMBA';
}
