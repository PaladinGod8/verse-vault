import { type ElectronApplication } from '@playwright/test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { _electron as electron } from 'playwright';

// Resolved relative to this helper file: tests/e2e/helpers/ -> project root
const mainJs = path.join(__dirname, '../../../.vite/build/main.js');

export interface LaunchResult {
  app: ElectronApplication;
  userDataDir: string;
}

/**
 * Launch the Electron app with an isolated temporary userData directory.
 * Each call creates a unique temp dir so parallel Playwright workers never
 * share the same SQLite database file.
 *
 * Returns { app, userDataDir }. Callers are responsible for fetching the
 * window (app.firstWindow() etc.) and calling closeApp() when done.
 */
export async function launchApp(): Promise<LaunchResult> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vv-e2e-'));

  const env = { ...process.env };
  // CRITICAL: VS Code / some terminals set ELECTRON_RUN_AS_NODE=1, which
  // makes Electron behave as plain Node.js (no process.type, no BrowserWindow).
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    args: [mainJs, `--user-data-dir=${userDataDir}`],
    env,
  });

  // Ensure test code that calls app.firstWindow() attaches to the app window,
  // not a stray DevTools window.
  await app.evaluate(async ({ BrowserWindow }) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows.find((candidate) => {
        const url = candidate.webContents.getURL();
        return !url.startsWith('devtools://');
      });
      if (mainWindow) {
        windows
          .filter((candidate) => candidate.webContents.getURL().startsWith('devtools://'))
          .forEach((candidate) => candidate.close());
        return;
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    }
  });

  return { app, userDataDir };
}

/**
 * Close the Electron app and remove the temporary userData directory.
 * Errors from both operations are suppressed so this is safe to call in
 * afterEach / afterAll / finally blocks even if the app has already closed.
 */
export async function closeApp(
  app: ElectronApplication,
  userDataDir: string,
): Promise<void> {
  await app.close().catch((): undefined => undefined);
  await fs
    .rm(userDataDir, { recursive: true, force: true })
    .catch((): undefined => undefined);
}
