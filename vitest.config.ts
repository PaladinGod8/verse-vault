import os from 'os';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    teardownTimeout: 20_000,
    setupFiles: ['./src/test-setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,

    // Use process isolation to make hard timeouts more reliable when a worker
    // event loop is blocked by long synchronous work.
    pool: 'forks',
    maxWorkers: Math.max(2, os.cpus().length - 1),

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      clean: false,
      cleanOnRerun: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test-setup.ts'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
