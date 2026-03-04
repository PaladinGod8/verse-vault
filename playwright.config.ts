import { defineConfig } from '@playwright/test';

// Prerequisite: run `yarn package` before `yarn test:e2e` to build
// .vite/build/main.js and .vite/renderer/main_window/index.html.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 0,
  workers: 2,
  reporter: [['html', { open: 'never' }]],
  outputDir: 'test-results/',
  use: {
    trace: 'on-first-retry',
  },
});
