/**
 * Unit tests for deriveIsland — the pure function that classifies an
 * employee's work island from HRIMS work-location fields.
 *
 * Policy under test (see island-utils.ts): every employee is UNGUJA unless a
 * Pemba signal is present. Pemba signals are the keywords: pemba, chake,
 * wete, mkoani, micheweni, uratibu — in any of department, workplace,
 * reporting office, or institution name.
 */
import { describe, it, expect } from 'vitest';
import { deriveIsland } from './island-utils';

describe('deriveIsland — default to UNGUJA', () => {
  it('returns UNGUJA when no fields are provided', () => {
    expect(deriveIsland()).toBe('UNGUJA');
  });

  it('returns UNGUJA when all fields are null/empty', () => {
    expect(deriveIsland(null, null, null, null)).toBe('UNGUJA');
    expect(deriveIsland('', '', '', '')).toBe('UNGUJA');
    expect(deriveIsland('   ', '  ', undefined, undefined)).toBe('UNGUJA');
  });

  it('returns UNGUJA for a generic ministry HQ employee with no island signal', () => {
    // The ~17k Education employees whose department says "Elimu ya
    // Maandalizi na Msingi" and workplace is the ministry — no Pemba signal.
    expect(
      deriveIsland(
        'Elimu ya Maandalizi na Msingi',
        'Wizara ya Elimu',
        'Wizara ya Elimu',
        'Wizara ya Elimu na Mafunzo ya Ufundi'
      )
    ).toBe('UNGUJA');
  });

  it('returns UNGUJA for a health worker with no island signal', () => {
    expect(
      deriveIsland('Idara ya Tiba', 'Wizara ya Afya', 'Wizara ya Afya', 'Wizara ya Afya')
    ).toBe('UNGUJA');
  });
});

describe('deriveIsland — explicit Pemba signal → PEMBA', () => {
  it('detects "pemba" in the department (subEntityName)', () => {
    expect(deriveIsland('Ofisi Kuu Pemba', 'Wizara ya Elimu', null, null)).toBe('PEMBA');
  });

  it('detects "pemba" in the workplace (entityName)', () => {
    expect(deriveIsland(null, 'Wilaya ya Wete', null, null)).toBe('PEMBA');
  });

  it('detects "pemba" in the reporting office (divisionName)', () => {
    expect(deriveIsland(null, null, 'Ofisi Kuu Pemba', null)).toBe('PEMBA');
  });

  it('detects "pemba" in the institution name', () => {
    expect(
      deriveIsland(null, null, null, 'Ofisi ya Mkuu wa Mkoa wa Kaskazini Pemba')
    ).toBe('PEMBA');
  });

  it('is case-insensitive across all fields', () => {
    expect(deriveIsland('OFISI KUU PEMBA', null, null, null)).toBe('PEMBA');
    expect(deriveIsland(null, 'PEMBA OFFICE', null, null)).toBe('PEMBA');
    expect(deriveIsland(null, null, 'pEmBa', null)).toBe('PEMBA');
  });
});

describe('deriveIsland — Pemba-only district keywords → PEMBA', () => {
  // Institutions entirely in Pemba: chake, wete, mkoani, micheweni.
  it.each([
    ['Chake Chake', 'chake'],
    ['Wilaya ya Wete', 'wete'],
    ['Mkoani', 'mkoani'],
    ['Micheweni', 'micheweni'],
  ])('detects "%s" via the %s keyword in workplace', (workplace) => {
    expect(deriveIsland(null, workplace, null, null)).toBe('PEMBA');
  });

  it('detects a Pemba district keyword in the institution name', () => {
    expect(deriveIsland(null, null, null, 'Hospitali ya Chake Chake')).toBe('PEMBA');
  });

  it('detects a Pemba district keyword in the department', () => {
    expect(deriveIsland('Ofisi ya Wete', null, null, null)).toBe('PEMBA');
  });
});

describe('deriveIsland — uratibu coordination offices → PEMBA', () => {
  it('detects "uratibu" in the workplace', () => {
    expect(deriveIsland(null, 'Ofisi ya Uratibu', null, null)).toBe('PEMBA');
  });

  it('detects "uratibu" in the institution name (case-insensitive)', () => {
    expect(deriveIsland(null, null, null, 'OFISI YA URATIBU')).toBe('PEMBA');
  });

  it('detects "uratibu" embedded in a longer department name', () => {
    expect(deriveIsland('Idara ya Uratibu wa Mkoa', null, null, null)).toBe('PEMBA');
  });
});

describe('deriveIsland — first Pemba signal wins', () => {
  it('returns PEMBA even when earlier fields are Unguja-only', () => {
    // Unguja-looking workplace, but the department is a Pemba office.
    expect(
      deriveIsland('Ofisi Kuu Pemba', 'Wizara ya Elimu', 'Wizara ya Elimu', 'Wizara ya Elimu')
    ).toBe('PEMBA');
  });

  it('does not false-positive on "unguja" when no Pemba keyword is present', () => {
    expect(deriveIsland('Ofisi ya Unguja', 'Mjini Magharibi', null, null)).toBe('UNGUJA');
  });
});