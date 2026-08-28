/**
 * Island derivation for employees.
 *
 * HRIMS does not send an explicit "which island does this person work on"
 * field. The `region` field is *birthplace*, not work location, so it is
 * intentionally NOT consulted here. The work-location signal is spread
 * across several HRIMS fields that map onto Employee columns:
 *
 *   HRIMS field                  → Employee column          → param here
 *   currentEmployment.subEntityName → department            → department
 *   currentEmployment.entityName    → currentWorkplace      → workplace
 *   currentEmployment.divisionName  → currentReportingOffice → reportingOffice
 *   Institution.name                → (join)                 → institutionName
 *
 * Policy (per product decision): every employee is assumed UNGUJA unless a
 * Pemba signal is present. There is no PENDING state. A Pemba signal is any
 * of the work-location fields matching:
 *
 *   1. The literal "pemba" (covers "Ofisi Kuu Pemba").
 *   2. A Pemba-only district name: chake, wete, mkoani, micheweni.
 *   3. "uratibu" — coordination offices are Pemba field offices in this
 *      dataset (e.g. "Ofisi ya Uratibu").
 *
 * The same keyword set is mirrored in the SQL backfill
 * (prisma/migrations/20260809000000_add_employee_island/migration.sql) and in
 * the `pembaIslandWhere` / `isPembaEmployee` helpers in role-utils.ts. Keep
 * them in sync.
 */

/** Keywords that mark a work-location field as Pemba. Lowercased, substring. */
const PEMBA_KEYWORDS = [
  'pemba',
  'chake',
  'wete',
  'mkoani',
  'micheweni',
  'uratibu',
] as const;

/**
 * Derive the island an employee works on from their work-location fields.
 * Returns `'PEMBA'` when any field carries a Pemba keyword, otherwise
 * `'UNGUJA'` (the default — there is no PENDING state). All inputs are
 * optional; missing/empty fields simply don't contribute a signal.
 */
export function deriveIsland(
  department?: string | null,
  workplace?: string | null,
  reportingOffice?: string | null,
  institutionName?: string | null
): 'PEMBA' | 'UNGUJA' {
  const fields = [department, workplace, reportingOffice, institutionName]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .map((s) => s.toLowerCase());

  for (const val of fields) {
    for (const kw of PEMBA_KEYWORDS) {
      if (val.includes(kw)) return 'PEMBA';
    }
  }
  return 'UNGUJA';
}