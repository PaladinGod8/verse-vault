import { defineConfig, devices } from '@playwright/test';

const parsedWorkers = Number.parseInt(
  process.env.PLAYWRIGHT_WORKERS ?? '',
  10,
);
const workerCount = Number.isFinite(parsedWorkers) && parsedWorkers > 0
  ? parsedWorkers
  : 2;

// Prerequisite: run `yarn package` before `yarn test:e2e` to build
// .vite/build/main.js and .vite/renderer/main_window/index.html.
//
// Worker Group Strategy:
// - smoke: lightweight fast tests (higher parallelization)
// - medium: medium-weight tests (moderate parallelization)
// - runtime: heavy runtime flows (conservative workers)
//
// Run all groups: `yarn test:e2e`
// Run one group: `yarn test:e2e --project=smoke`
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 0,
  workers: workerCount, // default cap for CI; local override via PLAYWRIGHT_WORKERS
  reporter: [['html', { open: 'never' }]],
  outputDir: 'test-results/',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: [
        'app.test.ts',
        'statblocks-crud.test.ts',
        'statblocks.test.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
      // Higher parallelization for fast tests
      fullyParallel: true,
    },
    {
      name: 'medium',
      testMatch: [
        'abilities.test.ts',
        'battlemaps.test.ts',
        'world-default-statistics.test.ts',
        'world-statistics-config.test.ts',
        'statblock-statistics.test.ts',
        'casting-range-overlay.test.ts',
        'tokenMove.test.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
      // Moderate parallelization
      fullyParallel: true,
    },
    {
      name: 'runtime',
      testMatch: [
        'arc-act.test.ts',
        'battlemap-runtime-play.test.ts',
        'battlemap-runtime-statblock-popup.test.ts',
        'tokens.test.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
      // Conservative workers for heavy tests
      fullyParallel: false,
    },
  ],
});
