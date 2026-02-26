import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

// Requires `yarn package` to have been run first so that
// .vite/build/main.js and .vite/renderer/main_window/ exist.
const mainJs = path.join(__dirname, '../../.vite/build/main.js');

test('app launches and shows welcome text', async () => {
  // Unset ELECTRON_RUN_AS_NODE (inherited from VS Code/terminals) so Electron
  // initializes as a proper GUI app rather than a plain Node.js process.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({ args: [mainJs], env });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  const body = await window.textContent('body');
  expect(body).toContain('Welcome to your Electron application.');

  await app.close();
});
