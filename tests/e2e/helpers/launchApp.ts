import { type ElectronApplication, expect } from '@playwright/test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { _electron as electron } from 'playwright';

const repoRoot = path.join(__dirname, '../../..');

interface LaunchTarget {
  args: string[];
  executablePath?: string;
}

export interface LaunchResult {
  app: ElectronApplication;
  userDataDir: string;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLaunchTarget(userDataDir: string): Promise<LaunchTarget> {
  // Prefer packaged app when present so default E2E runs exercise the same
  // artifact humans ship, not only the repo-local dev bundle fallback.
  const packageJson = JSON.parse(
    await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'),
  ) as { productName?: string; name?: string; };
  const appName = packageJson.productName ?? packageJson.name;
  if (!appName) {
    throw new Error('Unable to resolve Electron launch target: package name is missing.');
  }

  const packagedApp = path.join(
    repoRoot,
    'out',
    `${appName}-win32-x64`,
    'resources',
    'app.asar',
  );
  if (await pathExists(packagedApp)) {
    return {
      args: [packagedApp, `--user-data-dir=${userDataDir}`],
    };
  }

  const mainJs = path.join(repoRoot, '.vite/build/main.js');
  if (await pathExists(mainJs)) {
    return {
      args: [mainJs, `--user-data-dir=${userDataDir}`],
    };
  }

  throw new Error(
    'Unable to resolve Electron launch target. Run `yarn package` or generate the Vite main bundle first.',
  );
}

/**
 * Launch the Electron app with an isolated temporary userData directory.
 * Each call creates a unique temp dir so parallel Playwright workers never
 * share the same SQLite database file.
 *
 * Returns { app, userDataDir }. Callers are responsible for fetching the
 * window (app.firstWindow() etc.) and calling closeApp() when done.
 */
export async function launchApp(existingUserDataDir?: string): Promise<LaunchResult> {
  const userDataDir = existingUserDataDir
    ?? await fs.mkdtemp(path.join(os.tmpdir(), 'vv-e2e-'));
  const launchTarget = await resolveLaunchTarget(userDataDir);

  const env = { ...process.env };
  // CRITICAL: VS Code / some terminals set ELECTRON_RUN_AS_NODE=1, which
  // makes Electron behave as plain Node.js (no process.type, no BrowserWindow).
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    ...launchTarget,
    env,
  });

  // Ensure test code that calls app.firstWindow() attaches to the app window,
  // not a stray DevTools window.
  await expect
    .poll(
      () => app.windows().some((candidate) => !candidate.url().startsWith('devtools://')),
      { timeout: 5000 },
    )
    .toBe(true);

  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()
      .filter((candidate) => candidate.webContents.getURL().startsWith('devtools://'))
      .forEach((candidate) => candidate.close());
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
  options?: { preserveUserDataDir?: boolean; },
): Promise<void> {
  await app.close().catch((): undefined => undefined);
  if (options?.preserveUserDataDir) {
    return;
  }
  await fs
    .rm(userDataDir, { recursive: true, force: true })
    .catch((): undefined => undefined);
}
