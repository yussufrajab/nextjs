/**
 * Utility functions for role-based access control
 */

// CSC internal roles that should see ALL institutions data
export const CSC_ROLES = ['ADMIN', 'HHRMD', 'HRMO', 'DO', 'PO', 'CSCS'];

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
export function shouldApplyInstitutionFilter(userRole: string | null, userInstitutionId: string | null): boolean {
  if (!userRole || !userInstitutionId) return false;
  return !isCSCRole(userRole);
}