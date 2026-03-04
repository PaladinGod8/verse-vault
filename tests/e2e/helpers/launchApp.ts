import { _electron as electron } from 'playwright';
import { type ElectronApplication } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

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
  await app.close().catch(() => undefined);
  await fs
    .rm(userDataDir, { recursive: true, force: true })
    .catch(() => undefined);
}
