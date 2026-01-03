# AI Agent Prompt: Fix Critical Code Quality Issues

You are a senior software engineer tasked with fixing critical code quality issues in a Next.js TypeScript project. Follow these instructions precisely to implement production-ready quality gates.

---

## Context

This Next.js application has the following critical issues that must be resolved:

1. TypeScript build errors are being ignored
2. Zero automated test coverage
3. No custom ESLint configuration
4. No code formatting tool configured
5. No pre-commit hooks for quality gates

---

## Task 1: Remove TypeScript Build Error Suppression

### Objective

Enable TypeScript strict checking and fix all type errors.

### Instructions

1. Open `next.config.ts` (or `next.config.js`)
2. **Remove** or **comment out** this section:
   ```typescript
   typescript: {
     ignoreBuildErrors: true,
   }
   ```
3. Run `npm run build` to identify all TypeScript errors
4. Fix each error systematically:
   - Add proper type annotations
   - Fix type mismatches
   - Add null checks where needed
   - Use proper TypeScript generics
5. Verify the build passes: `npm run build`

### Success Criteria

- ✅ `ignoreBuildErrors` setting removed from config
- ✅ `npm run build` completes without TypeScript errors
- ✅ All `.ts` and `.tsx` files have proper type annotations

---

## Task 2: Set Up Vitest + Testing Infrastructure

### Objective

Implement automated testing with Vitest, React Testing Library, and Playwright for E2E tests.

### Instructions

#### Step 1: Install Dependencies

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install --save-dev @playwright/test
```

#### Step 2: Create Vitest Configuration

Create `vitest.config.ts` in the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        '**/*.config.{js,ts}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
```

#### Step 3: Create Test Setup File

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

#### Step 4: Initialize Playwright

```bash
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Step 5: Update package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

#### Step 6: Create Example Tests

**Unit Test Example** (`__tests__/utils/example.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';

// Example utility function to test
function add(a: number, b: number): number {
  return a + b;
}

describe('add function', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});
```

**Component Test Example** (`__tests__/components/Button.test.tsx`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Example Button component
function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick}>{children}</button>;
}

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**E2E Test Example** (`e2e/homepage.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Home/i);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  await page.click('a[href="/about"]');
  await expect(page).toHaveURL(/.*about/);
});
```

### Success Criteria

- ✅ Vitest configured and running
- ✅ At least 3 unit tests created
- ✅ At least 2 component tests created
- ✅ At least 1 E2E test created
- ✅ All tests pass: `npm test`
- ✅ Coverage report generated: `npm run test:coverage`

---

## Task 3: Configure Custom ESLint Rules

### Objective

Implement strict ESLint configuration with TypeScript, React, and Next.js best practices.

### Instructions

#### Step 1: Install ESLint Plugins

```bash
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

#### Step 2: Create `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    // TypeScript Rules
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": [
      "warn",
      {
        "allowExpressions": true,
        "allowTypedFunctionExpressions": true
      }
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",

    // React Rules
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",

    // General Rules
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

#### Step 3: Create `.eslintignore`

```
node_modules/
.next/
out/
build/
dist/
*.config.js
*.config.ts
coverage/
public/
```

#### Step 4: Update package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix"
  }
}
```

#### Step 5: Fix All Linting Errors

```bash
npm run lint:fix
npm run lint
```

### Success Criteria

- ✅ `.eslintrc.json` created with strict rules
- ✅ `npm run lint` passes with no errors
- ✅ Common anti-patterns are caught (unused vars, missing deps, etc.)

---

## Task 4: Set Up Prettier for Code Formatting

### Objective

Implement automatic code formatting with Prettier.

### Instructions

#### Step 1: Install Prettier

```bash
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

#### Step 2: Create `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

#### Step 3: Create `.prettierignore`

```
node_modules/
.next/
out/
build/
dist/
coverage/
public/
*.config.js
*.config.ts
package-lock.json
pnpm-lock.yaml
yarn.lock
```

#### Step 4: Update `.eslintrc.json`

Add Prettier to the extends array:

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ]
}
```

#### Step 5: Update package.json Scripts

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

#### Step 6: Format All Files

```bash
npm run format
```

### Success Criteria

- ✅ Prettier configured and integrated with ESLint
- ✅ All files formatted consistently
- ✅ `npm run format:check` passes
- ✅ No ESLint/Prettier conflicts

---

## Task 5: Implement Pre-commit Hooks

### Objective

Prevent bad code from being committed using Husky and lint-staged.

### Instructions

#### Step 1: Install Husky and lint-staged

```bash
npm install --save-dev husky lint-staged
npx husky init
```

#### Step 2: Configure lint-staged

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "vitest related --run"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

#### Step 3: Create Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Type check
npm run type-check
```

#### Step 4: Create Pre-push Hook

Create `.husky/pre-push`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run all tests
npm run test -- --run

# Run build to ensure it works
npm run build
```

#### Step 5: Add Type Check Script

Add to `package.json`:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

#### Step 6: Make Hooks Executable

```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

#### Step 7: Test the Hooks

```bash
# Make a test change
echo "// test" >> src/test-file.ts

# Try to commit
git add .
git commit -m "Test pre-commit hook"

# Verify that:
# - ESLint runs
# - Prettier formats
# - Tests run
# - Type checking happens
```

### Success Criteria

- ✅ Husky initialized successfully
- ✅ Pre-commit hook prevents bad code from being committed
- ✅ Pre-push hook runs full test suite
- ✅ Type checking enforced before commits
- ✅ Commits are automatically formatted and linted

---

## Final Verification Checklist

Run these commands to verify everything works:

```bash
# 1. TypeScript compiles without errors
npm run type-check

# 2. All tests pass
npm run test -- --run
npm run test:e2e

# 3. Linting passes
npm run lint

# 4. Formatting is consistent
npm run format:check

# 5. Build succeeds
npm run build

# 6. Pre-commit hooks work
git add .
git commit -m "Fix critical issues"
```

### All Checks Must Pass

- ✅ TypeScript: No errors
- ✅ Tests: All passing with coverage report
- ✅ ESLint: No errors or warnings
- ✅ Prettier: All files formatted
- ✅ Pre-commit hooks: Working correctly
- ✅ Build: Successful

---

## Additional Notes

1. **Coverage Threshold**: Consider adding minimum coverage requirements:

   ```json
   // vitest.config.ts
   coverage: {
     thresholds: {
       lines: 70,
       functions: 70,
       branches: 70,
       statements: 70
     }
   }
   ```

2. **CI/CD Integration**: Add these checks to your CI pipeline:

   ```yaml
   # .github/workflows/ci.yml
   - run: npm run type-check
   - run: npm run lint
   - run: npm run test -- --run
   - run: npm run build
   ```

3. **VSCode Integration**: Create `.vscode/settings.json`:
   ```json
   {
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "typescript.tsdk": "node_modules/typescript/lib"
   }
   ```

---

## Success Indicators

You've successfully completed this task when:

1. ✅ Zero TypeScript errors in the codebase
2. ✅ Test coverage reports generated (aim for >70%)
3. ✅ ESLint catches common mistakes automatically
4. ✅ All code is consistently formatted
5. ✅ Pre-commit hooks prevent bad code from being committed
6. ✅ `npm run build` succeeds without warnings
7. ✅ Team can commit with confidence knowing quality gates are in place

**You now have a production-ready quality assurance system!**
