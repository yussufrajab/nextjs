// Employee status validation utilities for HR request submissions
// Defines which request types are allowed based on employee status

export type RequestType =
  | 'confirmation'
  | 'lwop'
  | 'promotion'
  | 'cadre-change'
  | 'service-extension'
  | 'resignation'
  | 'retirement'
  | 'termination';

export type EmployeeStatus =
  | 'On Probation'
  | 'Confirmed'
  | 'On LWOP'
  | 'Retired'
  | 'Resigned'
  | 'Terminated'
  | 'Dismissed'
  | string; // Allow other statuses

// Define restricted request types for each employee status
const statusRestrictions: Record<string, RequestType[]> = {
  'On Probation': [
    'lwop',
    'promotion',
    'cadre-change',
    'service-extension',
    'retirement',
  ],
  'On LWOP': [
    'confirmation',
    'lwop',
    'promotion',
    'cadre-change',
    'service-extension',
  ],
  Retired: [
    'confirmation',
    'lwop',
    'promotion',
    'cadre-change',
    'resignation',
    'retirement',
    'termination',
  ],
  Resigned: [
    'confirmation',
    'lwop',
    'promotion',
    'cadre-change',
    'resignation',
    'retirement',
    'termination',
  ],
  Terminated: [
    'confirmation',
    'lwop',
    'promotion',
    'cadre-change',
    'resignation',
    'retirement',
    'termination',
  ],
  Dismissed: [
    'confirmation',
    'lwop',
    'promotion',
    'cadre-change',
    'resignation',
    'retirement',
    'termination',
  ],
};

/**
 * Validates if an HR request can be submitted based on employee status
 * @param employeeStatus - Current status of the employee
 * @param requestType - Type of request being submitted
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateEmployeeStatusForRequest(
  employeeStatus: string | null | undefined,
  requestType: RequestType
): { isValid: boolean; message?: string } {
  // If employee status is not set, allow all requests (backward compatibility)
  if (!employeeStatus) {
    return { isValid: true };
  }

  // Get restricted request types for this employee status
  const restrictedRequests = statusRestrictions[employeeStatus] || [];

  // Check if this request type is restricted for the employee's current status
  if (restrictedRequests.includes(requestType)) {
    const statusDisplayName = employeeStatus;
    const requestDisplayName = getRequestDisplayName(requestType);

    // Special messages for specific status and request type combinations
    if (
      employeeStatus === 'On Probation' &&
      requestType === 'service-extension'
    ) {
      return {
        isValid: false,
        message:
          'Employees on probation are not eligible for service extension.',
      };
    }

    // Specific messages for terminated employment statuses
    if (
      ['Retired', 'Resigned', 'Terminated', 'Dismissed'].includes(
        employeeStatus
      ) &&
      requestType === 'promotion'
    ) {
      return {
        isValid: false,
        message: `Cannot submit promotion request. Employee status is "${statusDisplayName}". ${statusDisplayName} employees are not eligible for promotion.`,
      };
    }

    // Specific messages for probation and LWOP statuses
    if (
      ['On Probation', 'On LWOP'].includes(employeeStatus) &&
      requestType === 'promotion'
    ) {
      return {
        isValid: false,
        message: `Cannot submit promotion request. Employee is currently "${statusDisplayName}" and is not eligible for promotion.`,
      };
    }

    return {
      isValid: false,
      message: `Cannot submit ${requestDisplayName} request. Employee status is "${statusDisplayName}" which restricts this request type.`,
    };
  }

  return { isValid: true };
}

/**
 * Get display name for request types
 */
function getRequestDisplayName(requestType: RequestType): string {
  const displayNames: Record<RequestType, string> = {
    confirmation: 'Confirmation',
    lwop: 'LWOP',
    promotion: 'Promotion',
    'cadre-change': 'Cadre Change',
    'service-extension': 'Service Extension',
    resignation: 'Resignation',
    retirement: 'Retirement',
    termination: 'Termination',
  };

  return displayNames[requestType] || requestType;
}

/**
 * Get all restricted request types for a given employee status
 * Useful for frontend to disable certain request buttons/forms
 */
export function getRestrictedRequestTypes(
  employeeStatus: string | null | undefined
): RequestType[] {
  if (!employeeStatus) {
    return [];
  }

  return statusRestrictions[employeeStatus] || [];
}

/**
 * Check if a specific request type is allowed for an employee status
 */
export function isRequestTypeAllowed(
  employeeStatus: string | null | undefined,
  requestType: RequestType
): boolean {
  const validation = validateEmployeeStatusForRequest(
    employeeStatus,
    requestType
  );
  return validation.isValid;
}
