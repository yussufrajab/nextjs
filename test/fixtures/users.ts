/**
 * Test User Fixtures
 *
 * Pre-defined test users for different roles
 */

export const testUsers = {
  admin: {
    id: 'test-admin-1',
    username: 'test_admin',
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  cscs: {
    id: 'test-cscs-1',
    username: 'test_cscs',
    role: 'CSCS',
    firstName: 'Chief',
    lastName: 'Secretary',
    email: 'cscs@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  do: {
    id: 'test-do-1',
    username: 'test_do',
    role: 'DO',
    firstName: 'Director',
    lastName: 'Operations',
    email: 'do@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  hhrmd: {
    id: 'test-hhrmd-1',
    username: 'test_hhrmd',
    role: 'HHRMD',
    firstName: 'Head',
    lastName: 'HRMD',
    email: 'hhrmd@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  hrmo: {
    id: 'test-hrmo-1',
    username: 'test_hrmo',
    role: 'HRMO',
    firstName: 'HR',
    lastName: 'Officer',
    email: 'hrmo@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  hro: {
    id: 'test-hro-1',
    username: 'test_hro',
    role: 'HRO',
    institutionId: 'test-institution-1',
    firstName: 'Institution',
    lastName: 'HRO',
    email: 'hro@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  employee: {
    id: 'test-employee-1',
    username: 'test_employee',
    role: 'EMPLOYEE',
    institutionId: 'test-institution-1',
    firstName: 'Test',
    lastName: 'Employee',
    email: 'employee@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  lockedUser: {
    id: 'test-locked-1',
    username: 'locked_user',
    role: 'EMPLOYEE',
    institutionId: 'test-institution-1',
    firstName: 'Locked',
    lastName: 'User',
    email: 'locked@test.com',
    isActive: true,
    isLocked: true,
    lockedAt: new Date(),
    failedLoginAttempts: 5,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  expiredPasswordUser: {
    id: 'test-expired-1',
    username: 'expired_password',
    role: 'EMPLOYEE',
    institutionId: 'test-institution-1',
    firstName: 'Expired',
    lastName: 'Password',
    email: 'expired@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() - 1000), // Expired
  },
};

/**
 * Create a custom test user
 */
export const createTestUser = (
  overrides: Partial<typeof testUsers.employee> = {}
) => {
  return {
    id: 'test-user-' + Math.random().toString(36).substring(7),
    username: 'test_user_' + Math.random().toString(36).substring(7),
    role: 'EMPLOYEE',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@test.com',
    isActive: true,
    isLocked: false,
    passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
};
