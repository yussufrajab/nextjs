/**
 * Unit Tests for the request status workflow FSM (isAllowedStatusTransition).
 *
 * BUG-001: the "Reject & Return to HRO" action (HHRMD/HRMO) on a request that
 * has reached the Commission review queue (`Approved by HRRP - Awaiting
 * Commission Review`) sends a variable `Rejected by {role} - Awaiting HRO
 * Correction` status. The FSM previously only allowed forwarding to the
 * Commission or a terminal Commission decision from that state, so the
 * return-to-HRO rejection was rejected with 400 → the dashboard showed
 * "Update Failed". These tests pin the return-to-HRO transition.
 */
import { describe, it, expect } from 'vitest';
import { isAllowedStatusTransition } from './request-workflow';

describe('isAllowedStatusTransition', () => {
  describe('no-op / terminal states', () => {
    it('allows a no-op transition (from === to)', () => {
      expect(isAllowedStatusTransition('Approved by Commission', 'Approved by Commission')).toBe(true);
    });

    it('blocks all transitions out of a terminal Commission approval', () => {
      expect(isAllowedStatusTransition('Approved by Commission', 'Pending HRRP Review')).toBe(false);
      expect(isAllowedStatusTransition('Approved by Commission', 'Rejected by HRRP - Awaiting HRO Correction')).toBe(false);
    });

    it('blocks all transitions out of a terminal Commission rejection', () => {
      expect(
        isAllowedStatusTransition('Rejected by Commission - Request Concluded', 'Pending HRRP Review'),
      ).toBe(false);
      expect(
        isAllowedStatusTransition('Rejected by Commission - Request Concluded', 'Approved by Commission'),
      ).toBe(false);
    });
  });

  describe('Pending HRRP Review', () => {
    it('allows HRRP approve / reject', () => {
      expect(isAllowedStatusTransition('Pending HRRP Review', 'Approved by HRRP - Awaiting Commission Review')).toBe(true);
      expect(isAllowedStatusTransition('Pending HRRP Review', 'Rejected by HRRP - Awaiting HRO Correction')).toBe(true);
    });

    it('blocks jumping straight to a Commission decision', () => {
      expect(isAllowedStatusTransition('Pending HRRP Review', 'Approved by Commission')).toBe(false);
    });
  });

  describe('Approved by HRRP - Awaiting Commission Review (Commission review queue)', () => {
    it('allows forwarding to the Commission (variable forward status)', () => {
      expect(
        isAllowedStatusTransition(
          'Approved by HRRP - Awaiting Commission Review',
          'Approved by HHRMD – Awaiting Commission Decision',
        ),
      ).toBe(true);
      expect(
        isAllowedStatusTransition(
          'Approved by HRRP - Awaiting Commission Review',
          'Request Received – Awaiting Commission Decision',
        ),
      ).toBe(true);
    });

    it('allows a terminal Commission decision', () => {
      expect(
        isAllowedStatusTransition('Approved by HRRP - Awaiting Commission Review', 'Approved by Commission'),
      ).toBe(true);
      expect(
        isAllowedStatusTransition(
          'Approved by HRRP - Awaiting Commission Review',
          'Rejected by Commission - Request Concluded',
        ),
      ).toBe(true);
    });

    // BUG-001 regression guard: the "Reject & Return to HRO" button sends a
    // variable `Rejected by {role} - Awaiting HRO Correction` status from this
    // state. This MUST be allowed.
    it('allows a return-to-HRO rejection by the reviewing role (HHRMD)', () => {
      expect(
        isAllowedStatusTransition(
          'Approved by HRRP - Awaiting Commission Review',
          'Rejected by HHRMD - Awaiting HRO Correction',
        ),
      ).toBe(true);
    });

    it('allows a return-to-HRO rejection by the reviewing role (HRMO)', () => {
      expect(
        isAllowedStatusTransition(
          'Approved by HRRP - Awaiting Commission Review',
          'Rejected by HRMO - Awaiting HRO Correction',
        ),
      ).toBe(true);
    });
  });

  describe('Rejected by HRRP - Awaiting HRO Correction (resubmit)', () => {
    it('allows resubmission back to Pending HRRP Review', () => {
      expect(isAllowedStatusTransition('Rejected by HRRP - Awaiting HRO Correction', 'Pending HRRP Review')).toBe(true);
    });

    it('blocks jumping to a Commission decision from a returned-to-HRO state', () => {
      expect(isAllowedStatusTransition('Rejected by HRRP - Awaiting HRO Correction', 'Approved by Commission')).toBe(false);
    });
  });

  describe('Awaiting Commission Decision (commission_review forward state)', () => {
    it('allows a terminal Commission decision', () => {
      expect(
        isAllowedStatusTransition('Approved by HHRMD – Awaiting Commission Decision', 'Approved by Commission'),
      ).toBe(true);
      expect(
        isAllowedStatusTransition(
          'Approved by HHRMD – Awaiting Commission Decision',
          'Rejected by Commission - Request Concluded',
        ),
      ).toBe(true);
    });

    // Commission-stage return-to-HRO: a Commission reviewer (HHRMD/HRMO) may
    // return an incomplete request to the HRO for correction instead of
    // concluding it. The dashboard's "Reject & Return to HRO" button sends a
    // variable `Rejected by {role} - Awaiting HRO Correction` status.
    it('allows a return-to-HRO rejection by the reviewing role (HHRMD)', () => {
      expect(
        isAllowedStatusTransition(
          'Approved by HHRMD – Awaiting Commission Decision',
          'Rejected by HHRMD - Awaiting HRO Correction',
        ),
      ).toBe(true);
    });

    it('allows a return-to-HRO rejection by the reviewing role (HRMO)', () => {
      expect(
        isAllowedStatusTransition(
          'Approved by HRMO – Awaiting Commission Decision',
          'Rejected by HRMO - Awaiting HRO Correction',
        ),
      ).toBe(true);
    });

    it('still blocks an arbitrary forward skip from the forward state', () => {
      expect(
        isAllowedStatusTransition('Approved by HHRMD – Awaiting Commission Decision', 'Pending HRRP Review'),
      ).toBe(false);
    });
  });
});