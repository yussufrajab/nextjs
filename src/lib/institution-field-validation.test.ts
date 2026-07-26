/**
 * Tests for institution org-field validation (Req 6.6).
 *
 * Covers the bootstrap behaviour (empty institution accepts any non-empty
 * value), rejection of unrecognized values once the institution has recorded
 * values, case-sensitivity, and the hasAnyOrgField short-circuit.
 */

import { describe, it, expect } from 'vitest';
import {
  getInstitutionOrgFieldValues,
  validateInstitutionOrgFields,
  hasAnyOrgField,
  type OrgFieldClient,
} from './institution-field-validation';

function makeClient(rowsByField: {
  ministry?: Array<Record<string, string | null>>;
  department?: Array<Record<string, string | null>>;
  currentWorkplace?: Array<Record<string, string | null>>;
}): OrgFieldClient {
  return {
    employee: {
      findMany: async (args: any) => {
        // The helper selects one of these fields per call.
        if (args.select?.ministry) return rowsByField.ministry ?? [];
        if (args.select?.department) return rowsByField.department ?? [];
        if (args.select?.currentWorkplace) return rowsByField.currentWorkplace ?? [];
        return [];
      },
    },
  };
}

describe('institution org-field validation (Req 6.6)', () => {
  describe('getInstitutionOrgFieldValues', () => {
    it('collects distinct non-null values into Sets per field', async () => {
      const client = makeClient({
        ministry: [{ ministry: 'Health' }, { ministry: 'Education' }],
        department: [{ department: 'HR' }],
        currentWorkplace: [{ currentWorkplace: 'Office A' }, { currentWorkplace: 'Office B' }],
      });
      const values = await getInstitutionOrgFieldValues(client, 'inst-1');
      expect(values.ministry).toEqual(new Set(['Health', 'Education']));
      expect(values.department).toEqual(new Set(['HR']));
      expect(values.currentWorkplace).toEqual(new Set(['Office A', 'Office B']));
    });

    it('filters out null values', async () => {
      const client = makeClient({
        ministry: [{ ministry: 'Health' }, { ministry: null }],
      });
      const values = await getInstitutionOrgFieldValues(client, 'inst-1');
      expect(values.ministry).toEqual(new Set(['Health']));
    });

    it('returns empty Sets when the institution has no recorded values', async () => {
      const client = makeClient({});
      const values = await getInstitutionOrgFieldValues(client, 'inst-1');
      expect(values.ministry.size).toBe(0);
      expect(values.department.size).toBe(0);
      expect(values.currentWorkplace.size).toBe(0);
    });
  });

  describe('validateInstitutionOrgFields', () => {
    it('bootstrap: accepts any non-empty value when no recorded values exist', () => {
      const allowed = {
        ministry: new Set<string>(),
        department: new Set<string>(),
        currentWorkplace: new Set<string>(),
      };
      const result = validateInstitutionOrgFields(
        { ministry: 'Brand New Ministry', department: 'New Dept', currentWorkplace: 'New Office' },
        allowed
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts values that match recorded ones (case-sensitive)', () => {
      const allowed = {
        ministry: new Set(['Health']),
        department: new Set(['HR']),
        currentWorkplace: new Set(['Office A']),
      };
      const result = validateInstitutionOrgFields(
        { ministry: 'Health', department: 'HR', currentWorkplace: 'Office A' },
        allowed
      );
      expect(result.valid).toBe(true);
    });

    it('rejects an unrecognized ministry with an informative message', () => {
      const allowed = {
        ministry: new Set(['Health', 'Education']),
        department: new Set(['HR']),
        currentWorkplace: new Set(['Office A']),
      };
      const result = validateInstitutionOrgFields(
        { ministry: 'Defence', department: 'HR', currentWorkplace: 'Office A' },
        allowed
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Ministry "Defence"');
      expect(result.errors[0]).toContain('Health');
      expect(result.errors[0]).toContain('Education');
    });

    it('rejects multiple unrecognized fields at once', () => {
      const allowed = {
        ministry: new Set(['Health']),
        department: new Set(['HR']),
        currentWorkplace: new Set(['Office A']),
      };
      const result = validateInstitutionOrgFields(
        { ministry: 'Defence', department: 'Finance', currentWorkplace: 'Office Z' },
        allowed
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('skips empty / optional values', () => {
      const allowed = {
        ministry: new Set(['Health']),
        department: new Set(['HR']),
        currentWorkplace: new Set(['Office A']),
      };
      // currentWorkplace omitted (optional) — must not error even though the
      // institution has recorded workplaces.
      const result = validateInstitutionOrgFields(
        { ministry: 'Health', department: 'HR', currentWorkplace: '' },
        allowed
      );
      expect(result.valid).toBe(true);
    });

    it('is case-sensitive (a different-case value is rejected)', () => {
      const allowed = {
        ministry: new Set(['Health']),
        department: new Set<string>(),
        currentWorkplace: new Set<string>(),
      };
      const result = validateInstitutionOrgFields(
        { ministry: 'health' },
        allowed
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('hasAnyOrgField', () => {
    it('returns false when all fields are empty/missing', () => {
      expect(hasAnyOrgField({})).toBe(false);
      expect(hasAnyOrgField({ ministry: '', department: '   ', currentWorkplace: null })).toBe(false);
    });

    it('returns true when any field is non-empty', () => {
      expect(hasAnyOrgField({ ministry: 'Health' })).toBe(true);
      expect(hasAnyOrgField({ department: 'HR' })).toBe(true);
      expect(hasAnyOrgField({ currentWorkplace: 'Office A' })).toBe(true);
    });
  });
});