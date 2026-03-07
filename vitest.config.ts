import os from 'os';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,

    // Use worker_threads for all runs (including coverage).
    // Threads start faster and share the V8 heap, which is safe here because
    // every test file mocks all native modules (electron, better-sqlite3).
    // Vitest still isolates each file's module registry (isolate: true default).
    pool: 'threads',
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
