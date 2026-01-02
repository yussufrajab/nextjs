# Testing Cookbook

**CSMS Unit Testing Guide**

This cookbook provides practical guidance for writing and running tests in the Civil Service Management System (CSMS) project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Running Tests](#running-tests)
3. [Testing Patterns](#testing-patterns)
4. [Mocking Strategies](#mocking-strategies)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Reference](#reference)

---

## Getting Started

### Prerequisites

All testing dependencies are already installed. The project uses:

- **Vitest 4** - Fast test runner with native TypeScript support
- **Testing Library** - React component testing utilities
- **jsdom** - DOM environment for browser-like testing
- **MSW** - Mock Service Worker for API mocking
- **vitest-mock-extended** - Enhanced mocking utilities

### Project Structure

```
/home/latest/
├── src/
│   ├── lib/
│   │   ├── password-utils.ts
│   │   └── password-utils.test.ts      # ← Utility tests
│   ├── components/
│   │   └── auth/
│   │       ├── login-form.tsx
│   │       └── login-form.test.tsx     # ← Component tests
│   └── app/api/                        # ← API routes (to be tested)
├── test/
│   ├── setup.ts                        # Global test setup
│   ├── helpers/
│   │   ├── mock-prisma.ts              # Prisma mocking utilities
│   │   ├── mock-session.ts             # Session mocking utilities
│   │   └── test-utils.tsx              # Custom render functions
│   └── fixtures/
│       ├── users.ts                    # Test user data
│       └── employees.ts                # Test employee data
├── vitest.config.ts                    # Vitest configuration
└── docs/
    ├── Unit_Test_Implementation_Plan.md
    └── Testing_Cookbook.md             # ← This file
```

### File Naming Conventions

- **Test files**: `{filename}.test.ts` or `{filename}.test.tsx`
- **Spec files**: `{filename}.spec.ts` (also supported)
- **Location**: Place test files next to the source files they test

Example:

```
src/lib/password-utils.ts       # Source file
src/lib/password-utils.test.ts  # Test file (same directory)
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests (watch mode)
npm test

# Run tests once and exit
npm run test:run

# Run with UI interface
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run in watch mode (auto-rerun on changes)
npm run test:watch
```

### Filtering Tests

```bash
# Run tests in a specific file
npm test password-utils.test.ts

# Run tests matching a pattern
npm test login

# Run only tests with specific name
npm test -t "should validate password"
```

### Watch Mode Tips

When running `npm test`, Vitest enters watch mode:

- Press **a** to run all tests
- Press **f** to run only failed tests
- Press **t** to filter by test name
- Press **q** to quit

### Coverage Reports

```bash
npm run test:coverage
```

This generates:

- **Terminal output**: Quick summary
- **HTML report**: `coverage/index.html` (open in browser)
- **LCOV report**: `coverage/lcov.info` (for CI/CD)

Coverage thresholds (configured in `vitest.config.ts`):

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

---

## Testing Patterns

### 1. Testing Utility Functions

**File**: `src/lib/password-utils.test.ts` (reference implementation)

```typescript
import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './password-utils';

describe('password-utils', () => {
  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'CorrectPassword123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(password, hashed);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const hashed = await hashPassword('CorrectPassword123!');
      const isMatch = await comparePassword('WrongPassword123!', hashed);

      expect(isMatch).toBe(false);
    });
  });
});
```

**Key Points**:

- Group related tests with `describe` blocks
- Use descriptive test names that read like sentences
- Test both happy paths and edge cases
- Test async functions with `async/await`

### 2. Testing React Components

**File**: `src/components/auth/login-form.test.tsx` (reference implementation)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('@/store/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('LoginForm', () => {
  const mockLogin = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuthStore as any).mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
    });

    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call login with correct credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        id: '1',
        username: 'testuser',
        role: 'HRO',
        name: 'Test User',
      });

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'Password123!');
      });
    });
  });
});
```

**Key Points**:

- Mock external dependencies (stores, routers, APIs)
- Reset mocks in `beforeEach` to ensure test isolation
- Use `userEvent` for simulating user interactions (more realistic than `fireEvent`)
- Use `waitFor` for async operations
- Query by role/label for accessibility-friendly tests

### 3. Testing API Routes (Next.js App Router)

**Pattern for testing API routes** (example - not yet implemented):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { prismaMock } from '@test/helpers/mock-prisma';
import { hashPassword } from '@/lib/password-utils';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authenticate valid credentials', async () => {
    const hashedPassword = await hashPassword('Password123!');

    prismaMock.user.findFirst.mockResolvedValue({
      id: '1',
      username: 'testuser',
      password: hashedPassword,
      role: 'HRO',
      name: 'Test User',
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'Password123!',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.username).toBe('testuser');
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ username: 'testuser' }, { email: 'testuser' }],
      },
    });
  });

  it('should reject invalid credentials', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'wronguser',
        password: 'WrongPass123!',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
```

**Key Points**:

- Mock Prisma client for database operations
- Create Request objects to test API handlers
- Test both success and error cases
- Verify database queries are called correctly
- Check response status codes and bodies

### 4. Testing Custom Hooks

**Pattern for testing custom hooks**:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmployeeData } from '@/hooks/use-employee-data';
import { prismaMock } from '@test/helpers/mock-prisma';

describe('useEmployeeData', () => {
  it('should fetch employee data', async () => {
    prismaMock.employee.findUnique.mockResolvedValue({
      id: '1',
      pfNumber: 'PF001',
      firstName: 'John',
      lastName: 'Doe',
      // ... other fields
    });

    const { result } = renderHook(() => useEmployeeData('1'));

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.pfNumber).toBe('PF001');
    });
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useEmployeeData('1'));

    expect(result.current.loading).toBe(true);
  });
});
```

**Key Points**:

- Use `renderHook` from Testing Library
- Test loading, success, and error states
- Mock API calls or data fetching

### 5. Testing Zustand Stores

**Pattern for testing Zustand stores**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/auth-store';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });

  it('should set user on login', () => {
    const testUser = {
      id: '1',
      username: 'testuser',
      role: 'HRO',
      name: 'Test User',
    };

    useAuthStore.getState().setUser(testUser);

    expect(useAuthStore.getState().user).toEqual(testUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('should clear user on logout', () => {
    useAuthStore.setState({
      user: { id: '1', username: 'test', role: 'HRO', name: 'Test' },
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
```

**Key Points**:

- Access store directly with `getState()`
- Reset state in `beforeEach`
- Test state changes and actions

---

## Mocking Strategies

### Mocking Prisma Client

The project provides a comprehensive Prisma mock in `test/helpers/mock-prisma.ts`.

**Basic usage**:

```typescript
import { prismaMock } from '@test/helpers/mock-prisma';

describe('User API', () => {
  it('should create a user', async () => {
    const mockUser = {
      id: '1',
      username: 'newuser',
      email: 'newuser@example.com',
      role: 'HRO',
    };

    prismaMock.user.create.mockResolvedValue(mockUser);

    const result = await prismaMock.user.create({
      data: {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'hashedpassword',
        role: 'HRO',
      },
    });

    expect(result).toEqual(mockUser);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: 'newuser',
      }),
    });
  });
});
```

**All Prisma operations are mocked**:

- `findUnique`, `findFirst`, `findMany`
- `create`, `update`, `delete`
- `upsert`, `count`, `aggregate`
- All models: user, employee, promotionRequest, confirmationRequest, etc.

### Mocking Next.js Navigation

Global mocks for Next.js navigation are configured in `test/setup.ts`.

**Using in tests**:

```typescript
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('MyComponent', () => {
  it('should navigate on click', async () => {
    const mockPush = vi.fn();

    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    });

    render(<MyComponent />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
```

### Mocking Sessions

Use the session helper from `test/helpers/mock-session.ts`:

```typescript
import { mockSession, mockAdminUser } from '@test/helpers/mock-session';

describe('Protected Route', () => {
  it('should allow access for authenticated user', async () => {
    const session = mockSession(mockAdminUser);

    // Use session in your test
  });
});
```

**Pre-defined mock users** (from `test/fixtures/users.ts`):

- `testUsers.admin` - CSCS (Admin) role
- `testUsers.hro` - HRO role
- `testUsers.hrmo` - HRMO role
- `testUsers.employee` - EMPLOYEE role
- `testUsers.lockedUser` - Locked out user
- `testUsers.expiredPasswordUser` - Password expired

### Mocking API Calls with MSW

For testing components that make API calls:

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/employees/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      pfNumber: 'PF001',
      firstName: 'John',
      lastName: 'Doe',
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('EmployeeProfile', () => {
  it('should display employee data', async () => {
    render(<EmployeeProfile id="1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

### Mocking Environment Variables

```typescript
import { beforeEach, afterEach, vi } from 'vitest';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use test database URL', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    // Test code that uses process.env.DATABASE_URL
  });
});
```

---

## Best Practices

### 1. Test Structure (AAA Pattern)

Organize tests using **Arrange, Act, Assert**:

```typescript
it('should calculate total price', () => {
  // Arrange - Set up test data and mocks
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];

  // Act - Execute the function being tested
  const total = calculateTotal(items);

  // Assert - Verify the result
  expect(total).toBe(35);
});
```

### 2. Test Isolation

Each test should be independent:

```typescript
describe('UserService', () => {
  beforeEach(() => {
    // Reset state before each test
    vi.clearAllMocks();
    resetPrismaMocks();
  });

  it('should not depend on other tests', () => {
    // This test runs in isolation
  });
});
```

### 3. Descriptive Test Names

Use descriptive names that explain the scenario:

```typescript
// ❌ Bad
it('test login', () => { ... });

// ✅ Good
it('should redirect to dashboard on successful login', () => { ... });
it('should show error message when credentials are invalid', () => { ... });
it('should lock account after 5 failed login attempts', () => { ... });
```

### 4. Test One Thing at a Time

Each test should verify a single behavior:

```typescript
// ❌ Bad - Testing multiple things
it('should handle user login', async () => {
  const user = await login('user', 'pass');
  expect(user).toBeDefined();
  expect(user.role).toBe('HRO');
  const session = await createSession(user);
  expect(session).toBeDefined();
  // Too many responsibilities
});

// ✅ Good - Separate tests
it('should return user on successful login', async () => {
  const user = await login('user', 'pass');
  expect(user).toBeDefined();
  expect(user.role).toBe('HRO');
});

it('should create session for authenticated user', async () => {
  const session = await createSession(mockUser);
  expect(session).toBeDefined();
});
```

### 5. Use Test Fixtures

Reuse test data from fixtures:

```typescript
import { testUsers } from '@test/fixtures/users';
import { testEmployees } from '@test/fixtures/employees';

it('should process promotion request', () => {
  const employee = testEmployees.active;
  const reviewer = testUsers.hro;

  // Use fixtures instead of creating data inline
});
```

### 6. Test Error Cases

Don't only test happy paths:

```typescript
describe('validatePasswordComplexity', () => {
  it('should accept valid password', () => {
    expect(validatePasswordComplexity('StrongPass123!')).toBe(true);
  });

  it('should reject password that is too short', () => {
    expect(validatePasswordComplexity('Short1!')).toBe(false);
  });

  it('should reject empty password', () => {
    expect(validatePasswordComplexity('')).toBe(false);
  });

  it('should reject null password', () => {
    expect(validatePasswordComplexity(null)).toBe(false);
  });
});
```

### 7. Avoid Test Interdependence

Don't rely on test execution order:

```typescript
// ❌ Bad - Tests depend on each other
let userId;

it('should create user', () => {
  userId = createUser();
  expect(userId).toBeDefined();
});

it('should find user', () => {
  const user = findUser(userId); // Depends on previous test
  expect(user).toBeDefined();
});

// ✅ Good - Independent tests
it('should create user', () => {
  const userId = createUser();
  expect(userId).toBeDefined();
});

it('should find user', () => {
  const userId = createUser(); // Set up own data
  const user = findUser(userId);
  expect(user).toBeDefined();
});
```

### 8. Use beforeEach and afterEach Wisely

```typescript
describe('Database operations', () => {
  beforeEach(() => {
    // Set up fresh state for each test
    vi.clearAllMocks();
    resetPrismaMocks();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  // Tests run with clean state
});
```

### 9. Test Accessibility

Use accessible queries:

```typescript
// ✅ Good - Query by role and accessible name
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);

// ⚠️ Avoid - Brittle tests
screen.getByTestId('submit-button');
screen.getByClassName('form-button');
```

### 10. Async Testing

Always use `async/await` and `waitFor`:

```typescript
// ❌ Bad - Missing await
it('should load data', () => {
  const data = fetchData(); // Promise not awaited
  expect(data).toBeDefined();
});

// ✅ Good - Proper async handling
it('should load data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ✅ Good - Wait for UI updates
it('should display data', async () => {
  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Problem**: Import paths not resolving

**Solution**: Check `tsconfig.json` and `vitest.config.ts` have matching path aliases:

```typescript
// vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

#### 2. "document is not defined"

**Problem**: DOM APIs not available

**Solution**: Ensure `environment: 'jsdom'` in `vitest.config.ts`:

```typescript
test: {
  environment: 'jsdom',
}
```

#### 3. Mock not being used

**Problem**: Mock defined but actual module is called

**Solution**:

- Ensure `vi.mock()` is at the top level (not inside `describe` or `it`)
- Check mock path matches actual import path
- Use `vi.clearAllMocks()` in `beforeEach`

```typescript
// ✅ Correct - Top level
vi.mock('@/store/auth-store');

describe('Component', () => {
  // Tests
});

// ❌ Wrong - Inside describe
describe('Component', () => {
  vi.mock('@/store/auth-store'); // Too late
});
```

#### 4. Tests pass individually but fail in suite

**Problem**: Test state leaking between tests

**Solution**: Reset state in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  resetPrismaMocks();
  // Reset store state
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
```

#### 5. "Cannot read property of undefined"

**Problem**: Mock not properly configured

**Solution**: Ensure mock returns complete object:

```typescript
// ❌ Bad - Incomplete mock
(useRouter as any).mockReturnValue({
  push: vi.fn(),
  // Missing other properties
});

// ✅ Good - Complete mock
(useRouter as any).mockReturnValue({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
});
```

#### 6. "Warning: ReactDOM.render is deprecated"

**Problem**: Using old React testing patterns

**Solution**: Use `render` from Testing Library:

```typescript
// ❌ Old
ReactDOM.render(<Component />, container);

// ✅ New
import { render } from '@testing-library/react';
render(<Component />);
```

#### 7. Timeout errors in async tests

**Problem**: Test exceeds timeout (default 5000ms)

**Solution**: Increase timeout or fix async handling:

```typescript
// Option 1: Increase timeout for specific test
it('should handle long operation', async () => {
  // Test code
}, 10000); // 10 second timeout

// Option 2: Use waitFor with timeout
await waitFor(
  () => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  },
  { timeout: 10000 }
);
```

#### 8. "Cannot spy on property because it is not a function"

**Problem**: Trying to mock non-function property

**Solution**: Use `vi.spyOn` correctly:

```typescript
// For object methods
vi.spyOn(myObject, 'myMethod').mockImplementation(() => 'mocked');

// For module exports
vi.spyOn(myModule, 'myFunction').mockReturnValue('mocked');
```

### Debugging Tests

#### Enable verbose output

```bash
npm test -- --reporter=verbose
```

#### Run single test file

```bash
npm test password-utils.test.ts
```

#### Run single test by name

```bash
npm test -t "should validate password"
```

#### Use `test.only` for focused testing

```typescript
// Run only this test
it.only('should focus on this test', () => {
  // Test code
});

// Skip this test
it.skip('should skip this test', () => {
  // Test code
});
```

#### Add debug output

```typescript
import { debug } from '@testing-library/react';

it('should render component', () => {
  const { debug } = render(<MyComponent />);

  debug(); // Prints DOM to console

  // Or debug specific element
  debug(screen.getByRole('button'));
});
```

#### Check what's rendered

```typescript
screen.debug(); // Full DOM tree
screen.logTestingPlaygroundURL(); // Get Testing Playground URL
```

---

## Reference

### Vitest APIs

#### Test Functions

- `describe(name, fn)` - Group related tests
- `it(name, fn)` - Define a test (alias: `test`)
- `beforeEach(fn)` - Run before each test
- `afterEach(fn)` - Run after each test
- `beforeAll(fn)` - Run once before all tests
- `afterAll(fn)` - Run once after all tests

#### Assertions

- `expect(value).toBe(expected)` - Strict equality (===)
- `expect(value).toEqual(expected)` - Deep equality
- `expect(value).toBeDefined()` - Value is not undefined
- `expect(value).toBeNull()` - Value is null
- `expect(value).toBeTruthy()` - Value is truthy
- `expect(value).toBeFalsy()` - Value is falsy
- `expect(value).toContain(item)` - Array/string contains item
- `expect(value).toMatch(regex)` - String matches regex
- `expect(value).toBeGreaterThan(n)` - Numeric comparison
- `expect(value).toHaveLength(n)` - Array/string length

#### Async Assertions

- `await expect(promise).resolves.toBe(value)` - Promise resolves
- `await expect(promise).rejects.toThrow()` - Promise rejects

#### Mock Functions

- `vi.fn()` - Create mock function
- `vi.mock('module')` - Mock entire module
- `vi.spyOn(object, 'method')` - Spy on method
- `vi.clearAllMocks()` - Clear mock call history
- `vi.resetAllMocks()` - Reset mock implementations
- `vi.restoreAllMocks()` - Restore original implementations

### Testing Library APIs

#### Queries

- `getByRole(role)` - Get by ARIA role
- `getByLabelText(text)` - Get by label text
- `getByText(text)` - Get by text content
- `getByTestId(id)` - Get by data-testid
- `queryBy*()` - Returns null if not found
- `findBy*()` - Async, waits for element

#### User Events

- `await user.click(element)` - Click element
- `await user.type(element, text)` - Type text
- `await user.clear(element)` - Clear input
- `await user.hover(element)` - Hover element
- `await user.selectOptions(element, value)` - Select option

#### Utilities

- `render(<Component />)` - Render component
- `screen` - Query rendered component
- `waitFor(() => {})` - Wait for condition
- `cleanup()` - Unmount components (auto in afterEach)

### jest-dom Matchers

- `toBeInTheDocument()` - Element is in DOM
- `toBeVisible()` - Element is visible
- `toBeDisabled()` - Element is disabled
- `toHaveValue(value)` - Input has value
- `toHaveTextContent(text)` - Element has text
- `toHaveAttribute(attr, value)` - Element has attribute
- `toHaveClass(class)` - Element has CSS class

### Configuration Files

#### vitest.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Enable global APIs
    environment: 'jsdom', // Use jsdom
    setupFiles: ['./test/setup.ts'],
    coverage: {
      /* config */
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 5000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### test/setup.ts

Global setup for all tests:

- Imports `@testing-library/jest-dom`
- Mocks Next.js navigation
- Mocks Next.js headers
- Sets up cleanup after each test

### Useful Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
- [MSW Documentation](https://mswjs.io/)
- [Testing Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

---

## Next Steps

### Phase 1: Critical Utils Testing (Weeks 2-3)

Now that the testing infrastructure is set up, the next phase focuses on testing critical utility files:

**Priority P0 (Security/Auth)**:

- `src/lib/auth.ts` - Authentication logic
- `src/lib/session.ts` - Session management
- `src/lib/password-utils.ts` - ✅ Already tested (55 tests)
- `src/lib/rbac.ts` - Role-based access control

**Priority P1 (Business Logic)**:

- `src/lib/validation.ts` - Data validation
- `src/lib/business-rules.ts` - Business rule enforcement
- `src/lib/workflow.ts` - Workflow state management

See `Unit_Test_Implementation_Plan.md` for complete roadmap.

### Getting Help

- Review this cookbook for patterns
- Check existing test files for examples
- See `Unit_Test_Implementation_Plan.md` for strategy
- Ask team members for code review

---

**Last Updated**: 2026-01-02
**Version**: 1.0
**Phase**: 0 (Framework Setup) - Complete
