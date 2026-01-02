import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Use jsdom for DOM testing (React components)
    environment: 'jsdom',

    // Setup files to run before each test file
    setupFiles: ['./test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/dist',
        '.next/',
        'coverage/',
        'prisma/',
        'scripts/',
        'docs/',
        'examples/',
        // Exclude Next.js specific files
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        // Exclude type definitions
        'src/lib/types.ts',
        // Exclude configuration
        'src/lib/backend-config.ts',
        // Exclude UI components (will test selectively)
        'src/components/ui/badge.tsx',
        'src/components/ui/skeleton.tsx',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      // Include source files for coverage
      include: ['src/**/*.{ts,tsx}'],
    },

    // Test file patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'coverage', 'prisma', 'scripts'],

    // Test timeout (5 seconds default)
    testTimeout: 5000,

    // Hook timeout (10 seconds)
    hookTimeout: 10000,

    // Disable isolation for faster tests (be careful with state)
    isolate: true,

    // Pool options for parallel execution (Vitest 4+)
    pool: 'threads',

    // Reporter configuration
    reporters: ['verbose'],

    // Mock options
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  // Resolve path aliases (must match tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
});
