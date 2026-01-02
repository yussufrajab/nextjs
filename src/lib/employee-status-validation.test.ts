/**
 * Tests for Employee Status Validation
 * Covers business logic for determining which HR requests are allowed based on employee status
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmployeeStatusForRequest,
  getRestrictedRequestTypes,
  isRequestTypeAllowed,
  type RequestType,
  type EmployeeStatus,
} from './employee-status-validation';

describe('employee-status-validation', () => {
  describe('validateEmployeeStatusForRequest', () => {
    describe('Null/Undefined Status Handling', () => {
      it('should allow all requests when employee status is null', () => {
        const result = validateEmployeeStatusForRequest(null, 'confirmation');
        expect(result.isValid).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('should allow all requests when employee status is undefined', () => {
        const result = validateEmployeeStatusForRequest(undefined, 'promotion');
        expect(result.isValid).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('should allow all request types when status is null', () => {
        const requestTypes: RequestType[] = [
          'confirmation', 'lwop', 'promotion', 'cadre-change',
          'service-extension', 'resignation', 'retirement', 'termination'
        ];

        requestTypes.forEach(type => {
          const result = validateEmployeeStatusForRequest(null, type);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('On Probation Status', () => {
      const status: EmployeeStatus = 'On Probation';

      it('should allow confirmation request', () => {
        const result = validateEmployeeStatusForRequest(status, 'confirmation');
        expect(result.isValid).toBe(true);
      });

      it('should allow resignation request', () => {
        const result = validateEmployeeStatusForRequest(status, 'resignation');
        expect(result.isValid).toBe(true);
      });

      it('should allow termination request', () => {
        const result = validateEmployeeStatusForRequest(status, 'termination');
        expect(result.isValid).toBe(true);
      });

      it('should reject LWOP request', () => {
        const result = validateEmployeeStatusForRequest(status, 'lwop');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On Probation');
        expect(result.message).toContain('LWOP');
      });

      it('should reject promotion request', () => {
        const result = validateEmployeeStatusForRequest(status, 'promotion');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On Probation');
        expect(result.message).toContain('Promotion');
      });

      it('should reject cadre change request', () => {
        const result = validateEmployeeStatusForRequest(status, 'cadre-change');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On Probation');
        expect(result.message).toContain('Cadre Change');
      });

      it('should reject service extension with special message', () => {
        const result = validateEmployeeStatusForRequest(status, 'service-extension');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Employees on probation are not eligible for service extension.');
      });

      it('should reject retirement request', () => {
        const result = validateEmployeeStatusForRequest(status, 'retirement');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On Probation');
        expect(result.message).toContain('Retirement');
      });
    });

    describe('On LWOP Status', () => {
      const status: EmployeeStatus = 'On LWOP';

      it('should allow resignation request', () => {
        const result = validateEmployeeStatusForRequest(status, 'resignation');
        expect(result.isValid).toBe(true);
      });

      it('should allow retirement request', () => {
        const result = validateEmployeeStatusForRequest(status, 'retirement');
        expect(result.isValid).toBe(true);
      });

      it('should allow termination request', () => {
        const result = validateEmployeeStatusForRequest(status, 'termination');
        expect(result.isValid).toBe(true);
      });

      it('should reject confirmation request', () => {
        const result = validateEmployeeStatusForRequest(status, 'confirmation');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On LWOP');
        expect(result.message).toContain('Confirmation');
      });

      it('should reject LWOP request (already on LWOP)', () => {
        const result = validateEmployeeStatusForRequest(status, 'lwop');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On LWOP');
        expect(result.message).toContain('LWOP');
      });

      it('should reject promotion request', () => {
        const result = validateEmployeeStatusForRequest(status, 'promotion');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On LWOP');
      });

      it('should reject cadre change request', () => {
        const result = validateEmployeeStatusForRequest(status, 'cadre-change');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On LWOP');
      });

      it('should reject service extension request', () => {
        const result = validateEmployeeStatusForRequest(status, 'service-extension');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('On LWOP');
      });
    });

    describe('Retired Status', () => {
      const status: EmployeeStatus = 'Retired';

      it('should allow service extension request only', () => {
        const result = validateEmployeeStatusForRequest(status, 'service-extension');
        expect(result.isValid).toBe(true);
      });

      it('should reject confirmation request', () => {
        const result = validateEmployeeStatusForRequest(status, 'confirmation');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });

      it('should reject LWOP request', () => {
        const result = validateEmployeeStatusForRequest(status, 'lwop');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });

      it('should reject promotion request', () => {
        const result = validateEmployeeStatusForRequest(status, 'promotion');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });

      it('should reject cadre change request', () => {
        const result = validateEmployeeStatusForRequest(status, 'cadre-change');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });

      it('should reject resignation request', () => {
        const result = validateEmployeeStatusForRequest(status, 'resignation');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });

      it('should reject retirement request', () => {
        const result = validateEmployeeStatusForRequest(status, 'retirement');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });

      it('should reject termination request', () => {
        const result = validateEmployeeStatusForRequest(status, 'termination');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Retired');
      });
    });

    describe('Resigned Status', () => {
      const status: EmployeeStatus = 'Resigned';

      it('should allow service extension request only', () => {
        const result = validateEmployeeStatusForRequest(status, 'service-extension');
        expect(result.isValid).toBe(true);
      });

      it('should reject all other request types', () => {
        const restrictedTypes: RequestType[] = [
          'confirmation', 'lwop', 'promotion', 'cadre-change',
          'resignation', 'retirement', 'termination'
        ];

        restrictedTypes.forEach(type => {
          const result = validateEmployeeStatusForRequest(status, type);
          expect(result.isValid).toBe(false);
          expect(result.message).toContain('Resigned');
        });
      });
    });

    describe('Terminated Status', () => {
      const status: EmployeeStatus = 'Terminated';

      it('should allow service extension request only', () => {
        const result = validateEmployeeStatusForRequest(status, 'service-extension');
        expect(result.isValid).toBe(true);
      });

      it('should reject all other request types', () => {
        const restrictedTypes: RequestType[] = [
          'confirmation', 'lwop', 'promotion', 'cadre-change',
          'resignation', 'retirement', 'termination'
        ];

        restrictedTypes.forEach(type => {
          const result = validateEmployeeStatusForRequest(status, type);
          expect(result.isValid).toBe(false);
          expect(result.message).toContain('Terminated');
        });
      });
    });

    describe('Dismissed Status', () => {
      const status: EmployeeStatus = 'Dismissed';

      it('should allow service extension request only', () => {
        const result = validateEmployeeStatusForRequest(status, 'service-extension');
        expect(result.isValid).toBe(true);
      });

      it('should reject all other request types', () => {
        const restrictedTypes: RequestType[] = [
          'confirmation', 'lwop', 'promotion', 'cadre-change',
          'resignation', 'retirement', 'termination'
        ];

        restrictedTypes.forEach(type => {
          const result = validateEmployeeStatusForRequest(status, type);
          expect(result.isValid).toBe(false);
          expect(result.message).toContain('Dismissed');
        });
      });
    });

    describe('Confirmed Status (No Restrictions)', () => {
      const status: EmployeeStatus = 'Confirmed';

      it('should allow all request types', () => {
        const allTypes: RequestType[] = [
          'confirmation', 'lwop', 'promotion', 'cadre-change',
          'service-extension', 'resignation', 'retirement', 'termination'
        ];

        allTypes.forEach(type => {
          const result = validateEmployeeStatusForRequest(status, type);
          expect(result.isValid).toBe(true);
          expect(result.message).toBeUndefined();
        });
      });
    });

    describe('Unknown Status', () => {
      it('should allow all requests for unknown/custom status', () => {
        const customStatus = 'Custom Status';
        const allTypes: RequestType[] = [
          'confirmation', 'lwop', 'promotion', 'cadre-change',
          'service-extension', 'resignation', 'retirement', 'termination'
        ];

        allTypes.forEach(type => {
          const result = validateEmployeeStatusForRequest(customStatus, type);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('Error Messages', () => {
      it('should include status and request type in error message', () => {
        const result = validateEmployeeStatusForRequest('On LWOP', 'promotion');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Promotion');
        expect(result.message).toContain('On LWOP');
        expect(result.message).toContain('Cannot submit');
      });

      it('should use display names for request types', () => {
        const result = validateEmployeeStatusForRequest('On Probation', 'cadre-change');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Cadre Change'); // Display name, not "cadre-change"
      });
    });
  });

  describe('getRestrictedRequestTypes', () => {
    it('should return empty array for null status', () => {
      const result = getRestrictedRequestTypes(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined status', () => {
      const result = getRestrictedRequestTypes(undefined);
      expect(result).toEqual([]);
    });

    it('should return restricted types for On Probation', () => {
      const result = getRestrictedRequestTypes('On Probation');
      expect(result).toContain('lwop');
      expect(result).toContain('promotion');
      expect(result).toContain('cadre-change');
      expect(result).toContain('service-extension');
      expect(result).toContain('retirement');
      expect(result).toHaveLength(5);
    });

    it('should return restricted types for On LWOP', () => {
      const result = getRestrictedRequestTypes('On LWOP');
      expect(result).toContain('confirmation');
      expect(result).toContain('lwop');
      expect(result).toContain('promotion');
      expect(result).toContain('cadre-change');
      expect(result).toContain('service-extension');
      expect(result).toHaveLength(5);
    });

    it('should return restricted types for Retired', () => {
      const result = getRestrictedRequestTypes('Retired');
      expect(result).toContain('confirmation');
      expect(result).toContain('lwop');
      expect(result).toContain('promotion');
      expect(result).toContain('cadre-change');
      expect(result).toContain('resignation');
      expect(result).toContain('retirement');
      expect(result).toContain('termination');
      expect(result).toHaveLength(7);
    });

    it('should return restricted types for Resigned', () => {
      const result = getRestrictedRequestTypes('Resigned');
      expect(result).toHaveLength(7);
    });

    it('should return restricted types for Terminated', () => {
      const result = getRestrictedRequestTypes('Terminated');
      expect(result).toHaveLength(7);
    });

    it('should return restricted types for Dismissed', () => {
      const result = getRestrictedRequestTypes('Dismissed');
      expect(result).toHaveLength(7);
    });

    it('should return empty array for Confirmed status', () => {
      const result = getRestrictedRequestTypes('Confirmed');
      expect(result).toEqual([]);
    });

    it('should return empty array for unknown status', () => {
      const result = getRestrictedRequestTypes('Unknown Status');
      expect(result).toEqual([]);
    });
  });

  describe('isRequestTypeAllowed', () => {
    it('should return true when request is allowed', () => {
      expect(isRequestTypeAllowed('On Probation', 'confirmation')).toBe(true);
      expect(isRequestTypeAllowed('Confirmed', 'promotion')).toBe(true);
      expect(isRequestTypeAllowed(null, 'lwop')).toBe(true);
    });

    it('should return false when request is restricted', () => {
      expect(isRequestTypeAllowed('On Probation', 'lwop')).toBe(false);
      expect(isRequestTypeAllowed('On LWOP', 'confirmation')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'promotion')).toBe(false);
    });

    it('should handle all request types for On Probation', () => {
      expect(isRequestTypeAllowed('On Probation', 'confirmation')).toBe(true);
      expect(isRequestTypeAllowed('On Probation', 'resignation')).toBe(true);
      expect(isRequestTypeAllowed('On Probation', 'termination')).toBe(true);
      expect(isRequestTypeAllowed('On Probation', 'lwop')).toBe(false);
      expect(isRequestTypeAllowed('On Probation', 'promotion')).toBe(false);
      expect(isRequestTypeAllowed('On Probation', 'cadre-change')).toBe(false);
      expect(isRequestTypeAllowed('On Probation', 'service-extension')).toBe(false);
      expect(isRequestTypeAllowed('On Probation', 'retirement')).toBe(false);
    });

    it('should handle all request types for Retired', () => {
      expect(isRequestTypeAllowed('Retired', 'service-extension')).toBe(true);
      expect(isRequestTypeAllowed('Retired', 'confirmation')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'lwop')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'promotion')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'cadre-change')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'resignation')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'retirement')).toBe(false);
      expect(isRequestTypeAllowed('Retired', 'termination')).toBe(false);
    });

    it('should return true for all types when status is null', () => {
      const allTypes: RequestType[] = [
        'confirmation', 'lwop', 'promotion', 'cadre-change',
        'service-extension', 'resignation', 'retirement', 'termination'
      ];

      allTypes.forEach(type => {
        expect(isRequestTypeAllowed(null, type)).toBe(true);
      });
    });

    it('should return true for all types when status is undefined', () => {
      const allTypes: RequestType[] = [
        'confirmation', 'lwop', 'promotion', 'cadre-change',
        'service-extension', 'resignation', 'retirement', 'termination'
      ];

      allTypes.forEach(type => {
        expect(isRequestTypeAllowed(undefined, type)).toBe(true);
      });
    });
  });

  describe('Integration: Status-Request Matrix', () => {
    it('should enforce correct restrictions across all statuses', () => {
      // On Probation: Can do confirmation, resignation, termination
      expect(isRequestTypeAllowed('On Probation', 'confirmation')).toBe(true);
      expect(isRequestTypeAllowed('On Probation', 'lwop')).toBe(false);

      // On LWOP: Can do resignation, retirement, termination
      expect(isRequestTypeAllowed('On LWOP', 'resignation')).toBe(true);
      expect(isRequestTypeAllowed('On LWOP', 'confirmation')).toBe(false);

      // Retired: Can only do service extension
      expect(isRequestTypeAllowed('Retired', 'service-extension')).toBe(true);
      expect(isRequestTypeAllowed('Retired', 'confirmation')).toBe(false);

      // Confirmed: Can do everything
      expect(isRequestTypeAllowed('Confirmed', 'confirmation')).toBe(true);
      expect(isRequestTypeAllowed('Confirmed', 'promotion')).toBe(true);
      expect(isRequestTypeAllowed('Confirmed', 'retirement')).toBe(true);
    });

    it('should have consistent restrictions for final statuses', () => {
      const finalStatuses: EmployeeStatus[] = ['Retired', 'Resigned', 'Terminated', 'Dismissed'];
      const allowedTypes: RequestType[] = ['service-extension'];
      const deniedTypes: RequestType[] = ['confirmation', 'lwop', 'promotion', 'cadre-change', 'resignation', 'retirement', 'termination'];

      finalStatuses.forEach(status => {
        allowedTypes.forEach(type => {
          expect(isRequestTypeAllowed(status, type)).toBe(true);
        });

        deniedTypes.forEach(type => {
          expect(isRequestTypeAllowed(status, type)).toBe(false);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string status', () => {
      const result = validateEmployeeStatusForRequest('', 'confirmation');
      // Empty string is falsy, should be treated like null
      expect(result.isValid).toBe(true);
    });

    it('should be case-sensitive for status names', () => {
      // "on probation" (lowercase) is not the same as "On Probation"
      const result = validateEmployeeStatusForRequest('on probation', 'lwop');
      // Should be treated as unknown status, allowing all requests
      expect(result.isValid).toBe(true);
    });

    it('should handle status with extra whitespace', () => {
      const result = validateEmployeeStatusForRequest(' On Probation ', 'lwop');
      // Exact match required, so this is unknown status
      expect(result.isValid).toBe(true);
    });
  });
});
