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
  | string; // Allow other statuses

// Define restricted request types for each employee status
const statusRestrictions: Record<string, RequestType[]> = {
  'On Probation': ['lwop', 'promotion', 'cadre-change', 'service-extension'],
  'On LWOP': ['confirmation', 'lwop', 'promotion', 'cadre-change', 'service-extension'],
  'Retired': ['confirmation', 'lwop', 'promotion', 'cadre-change', 'resignation', 'service-extension'],
  'Resigned': ['confirmation', 'lwop', 'promotion', 'cadre-change', 'resignation', 'service-extension']
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
    
    return {
      isValid: false,
      message: `Cannot submit ${requestDisplayName} request. Employee status is "${statusDisplayName}" which restricts this request type.`
    };
  }

  return { isValid: true };
}

/**
 * Get display name for request types
 */
function getRequestDisplayName(requestType: RequestType): string {
  const displayNames: Record<RequestType, string> = {
    'confirmation': 'Confirmation',
    'lwop': 'LWOP',
    'promotion': 'Promotion', 
    'cadre-change': 'Cadre Change',
    'service-extension': 'Service Extension',
    'resignation': 'Resignation',
    'retirement': 'Retirement',
    'termination': 'Termination'
  };
  
  return displayNames[requestType] || requestType;
}

/**
 * Get all restricted request types for a given employee status
 * Useful for frontend to disable certain request buttons/forms
 */
export function getRestrictedRequestTypes(employeeStatus: string | null | undefined): RequestType[] {
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
  const validation = validateEmployeeStatusForRequest(employeeStatus, requestType);
  return validation.isValid;
}