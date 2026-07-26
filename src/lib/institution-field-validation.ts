/**
 * Institution org-field validation (Req 6.6).
 *
 * `Employee.ministry`, `Employee.department`, and `Employee.currentWorkplace`
 * are free-text nullable String columns — there is no canonical Ministry /
 * Department / Workplace reference table in the schema. Without validation an
 * HRO can enter arbitrary/garbage organizational values that drift away from
 * the institution's established structure.
 *
 * Closing the gap: we treat the distinct values already recorded for the
 * institution's employees as that institution's de-facto org-unit reference
 * data, and reject supplied values that are not part of it.
 *
 * Bootstrap: when the institution has NO recorded values for a field yet
 * (first employee, or no prior record set that field), any non-empty value is
 * accepted so legitimate first entries are not blocked. Once at least one
 * value exists, supplied values must match one of the existing values. This
 * prevents typo/garbage drift while keeping cold-start entry working.
 *
 * Dependency-injected (`client`) so it can be unit-tested with a mock and used
 * from both the manual-entry and bulk-upload routes, each of which holds its
 * own PrismaClient instance.
 */

export type OrgField = 'ministry' | 'department' | 'currentWorkplace';

export interface InstitutionOrgFieldValues {
  ministry: Set<string>;
  department: Set<string>;
  currentWorkplace: Set<string>;
}

export interface OrgFieldValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Minimal structural type for the Prisma client surface this module needs.
 * `PrismaClient.employee.findMany` is heavily generic, so the param/return
 * are typed loosely (`any`) here to keep this injectable and unit-testable
 * without coupling to Prisma's generated generics. Both `PrismaClient` and
 * route-local instances satisfy it.
 */
export interface OrgFieldClient {
  employee: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: (args: any) => Promise<any[]>;
  };
}

/**
 * Fetch the distinct non-null ministry / department / currentWorkplace values
 * already recorded for the institution's employees. Three small distinct
 * queries rather than one (Prisma `distinct` applies to the column tuple, so a
 * single multi-column distinct would yield combinations, not per-field sets).
 */
export async function getInstitutionOrgFieldValues(
  client: OrgFieldClient,
  institutionId: string
): Promise<InstitutionOrgFieldValues> {
  const [ministries, departments, workplaces] = await Promise.all([
    client.employee.findMany({
      where: { institutionId, ministry: { not: null } },
      distinct: ['ministry'],
      select: { ministry: true },
    }),
    client.employee.findMany({
      where: { institutionId, department: { not: null } },
      distinct: ['department'],
      select: { department: true },
    }),
    client.employee.findMany({
      where: { institutionId, currentWorkplace: { not: null } },
      distinct: ['currentWorkplace'],
      select: { currentWorkplace: true },
    }),
  ]);

  return {
    ministry: new Set(ministries.map((r) => r.ministry).filter(Boolean) as string[]),
    department: new Set(departments.map((r) => r.department).filter(Boolean) as string[]),
    currentWorkplace: new Set(workplaces.map((r) => r.currentWorkplace).filter(Boolean) as string[]),
  };
}

const FIELD_LABELS: Record<OrgField, string> = {
  ministry: 'Ministry',
  department: 'Department',
  currentWorkplace: 'Current Workplace',
};

/**
 * Validate a single org field. Returns an error string if the value is
 * non-empty, the institution already has recorded values for this field, and
 * the supplied value is not among them. Empty/optional values and the
 * bootstrap case (no recorded values) pass.
 */
function checkOrgField(
  field: OrgField,
  value: string | null | undefined,
  allowed: Set<string>
): string | null {
  const v = (value ?? '').trim();
  if (!v) return null; // empty / optional → skip
  if (allowed.size === 0) return null; // bootstrap → accept any non-empty value
  if (allowed.has(v)) return null;
  const sample = Array.from(allowed).slice(0, 20).join(', ');
  const suffix = allowed.size > 20 ? ', …' : '';
  return `${FIELD_LABELS[field]} "${v}" is not a recognized value for your institution. Allowed: ${sample}${suffix}`;
}

/**
 * Validate supplied ministry / department / currentWorkplace values against an
 * institution's existing recorded values (see getInstitutionOrgFieldValues).
 */
export function validateInstitutionOrgFields(
  values: { ministry?: string | null; department?: string | null; currentWorkplace?: string | null },
  allowed: InstitutionOrgFieldValues
): OrgFieldValidationResult {
  const errors: string[] = [];
  const e1 = checkOrgField('ministry', values.ministry, allowed.ministry);
  if (e1) errors.push(e1);
  const e2 = checkOrgField('department', values.department, allowed.department);
  if (e2) errors.push(e2);
  const e3 = checkOrgField('currentWorkplace', values.currentWorkplace, allowed.currentWorkplace);
  if (e3) errors.push(e3);
  return { valid: errors.length === 0, errors };
}

/**
 * True if any of the org fields is non-empty — lets callers skip the lookup
 * query entirely when none of these fields were supplied (e.g. a manual-entry
 * request that omits all three).
 */
export function hasAnyOrgField(values: {
  ministry?: string | null;
  department?: string | null;
  currentWorkplace?: string | null;
}): boolean {
  return Boolean(
    (values.ministry ?? '').trim() ||
      (values.department ?? '').trim() ||
      (values.currentWorkplace ?? '').trim()
  );
}