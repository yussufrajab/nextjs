/**
 * Tests for employee business-rule validation (Req 6.8): enums, identifier
 * formats, and cross-field date logic.
 */

import { describe, it, expect } from 'vitest';
import {
  GENDER_VALUES,
  APPOINTMENT_TYPE_VALUES,
  CONTRACT_TYPE_VALUES,
  isValidEnum,
  isValidZssfNumber,
  isValidPayrollNumber,
  parseISODate,
  validateCrossFieldDates,
} from './employee-field-validation';

describe('employee business-rule validation (Req 6.8)', () => {
  describe('enums', () => {
    it('exposes the canonical enum value sets', () => {
      expect(GENDER_VALUES).toEqual(['Male', 'Female']);
      expect(APPOINTMENT_TYPE_VALUES).toEqual(['Permanent', 'Contract', 'Temporary', 'Casual']);
      expect(CONTRACT_TYPE_VALUES).toEqual(['Full-time', 'Part-time']);
    });

    it('isValidEnum accepts empty/optional values', () => {
      expect(isValidEnum('', APPOINTMENT_TYPE_VALUES)).toBe(true);
      expect(isValidEnum(null, APPOINTMENT_TYPE_VALUES)).toBe(true);
      expect(isValidEnum(undefined, APPOINTMENT_TYPE_VALUES)).toBe(true);
    });

    it('isValidEnum accepts allowed values and rejects others', () => {
      expect(isValidEnum('Permanent', APPOINTMENT_TYPE_VALUES)).toBe(true);
      expect(isValidEnum('Casual', APPOINTMENT_TYPE_VALUES)).toBe(true);
      expect(isValidEnum('Intern', APPOINTMENT_TYPE_VALUES)).toBe(false);
      expect(isValidEnum('Full-time', CONTRACT_TYPE_VALUES)).toBe(true);
      expect(isValidEnum('Casual', CONTRACT_TYPE_VALUES)).toBe(false);
    });
  });

  describe('identifier formats', () => {
    it('accepts known real/legacy ZSSF + payroll formats', () => {
      for (const v of ['ZSSF001', 'ZSSF123456', 'SSF-1']) {
        expect(isValidZssfNumber(v)).toBe(true);
      }
      for (const v of ['PAY001', 'PR001', 'PR-1']) {
        expect(isValidPayrollNumber(v)).toBe(true);
      }
    });

    it('accepts empty/optional values', () => {
      expect(isValidZssfNumber('')).toBe(true);
      expect(isValidZssfNumber(null)).toBe(true);
      expect(isValidPayrollNumber(undefined)).toBe(true);
    });

    it('rejects garbage: spaces, symbols, leading hyphen, too short/long', () => {
      const bad = [' ', 'ZSSF 123', 'ZSSF/123', '-SSF1', 'Z', 'ZSSF#1', 'Z'.repeat(51)];
      for (const v of bad) {
        expect(isValidZssfNumber(v)).toBe(false);
        expect(isValidPayrollNumber(v)).toBe(false);
      }
    });

    it('trims surrounding whitespace before checking', () => {
      expect(isValidZssfNumber('  ZSSF001  ')).toBe(true);
    });
  });

  describe('parseISODate', () => {
    it('parses valid YYYY-MM-DD', () => {
      const d = parseISODate('2020-01-15');
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(2020);
    });

    it('returns null for empty or invalid formats', () => {
      expect(parseISODate('')).toBeNull();
      expect(parseISODate(null)).toBeNull();
      expect(parseISODate('2020/01/15')).toBeNull();
      expect(parseISODate('15-01-2020')).toBeNull();
      expect(parseISODate('not-a-date')).toBeNull();
    });
  });

  describe('validateCrossFieldDates', () => {
    it('passes when dates are consistent', () => {
      expect(
        validateCrossFieldDates({
          dateOfBirth: '1990-01-01',
          employmentDate: '2018-01-10',
          confirmationDate: '2019-01-10',
          retirementDate: '2055-01-15',
        })
      ).toEqual([]);
    });

    it('flags employmentDate not after dateOfBirth', () => {
      const errors = validateCrossFieldDates({
        dateOfBirth: '1990-01-01',
        employmentDate: '1990-01-01', // equal → not strictly after
      });
      expect(errors).toContain('Employment date must be after date of birth');
    });

    it('flags employmentDate before dateOfBirth', () => {
      const errors = validateCrossFieldDates({
        dateOfBirth: '1990-01-01',
        employmentDate: '1985-01-01',
      });
      expect(errors).toContain('Employment date must be after date of birth');
    });

    it('flags confirmationDate before employmentDate', () => {
      const errors = validateCrossFieldDates({
        employmentDate: '2018-01-10',
        confirmationDate: '2017-12-31',
      });
      expect(errors).toContain('Confirmation date cannot be before employment date');
    });

    it('allows confirmationDate equal to employmentDate', () => {
      const errors = validateCrossFieldDates({
        employmentDate: '2018-01-10',
        confirmationDate: '2018-01-10',
      });
      expect(errors).toEqual([]);
    });

    it('flags retirementDate not after employmentDate', () => {
      const errors = validateCrossFieldDates({
        employmentDate: '2018-01-10',
        retirementDate: '2018-01-10', // equal → not strictly after
      });
      expect(errors).toContain('Retirement date must be after employment date');
    });

    it('flags all three violations at once', () => {
      const errors = validateCrossFieldDates({
        dateOfBirth: '2000-01-01',
        employmentDate: '1999-01-01', // before DOB
        confirmationDate: '1998-01-01', // before employment
        retirementDate: '1999-01-01', // not after employment
      });
      expect(errors).toHaveLength(3);
    });

    it('skips comparisons when a field is missing or invalid', () => {
      expect(validateCrossFieldDates({ dateOfBirth: '1990-01-01' })).toEqual([]);
      expect(
        validateCrossFieldDates({ dateOfBirth: '1990-01-01', employmentDate: 'not-a-date' })
      ).toEqual([]); // invalid employmentDate format → skip, no spurious error
    });
  });
});