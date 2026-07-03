import { type ElectronApplication } from '@playwright/test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { _electron as electron } from 'playwright';

const repoRoot = path.join(__dirname, '../../..');
const WINDOW_DISCOVERY_TIMEOUT_MS = 15000;
const APP_CLOSE_TIMEOUT_MS = 5000;

interface LaunchTarget {
  args: string[];
  label: string;
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

async function resolveLaunchTargets(userDataDir: string): Promise<LaunchTarget[]> {
  // Prefer packaged app when present. If Electron+Playwright cannot attach to
  // that target in current environment, fall back to repo root so local verify
  // lanes still exercise the freshly-built `.vite` assets from `yarn package`.
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
  const targets: LaunchTarget[] = [];
  if (await pathExists(packagedApp)) {
    targets.push({
      label: 'packaged-app.asar',
      args: [packagedApp, `--user-data-dir=${userDataDir}`],
    });
  }

  if (await pathExists(path.join(repoRoot, 'package.json'))) {
    targets.push({
      label: 'repo-root-package',
      args: [repoRoot, `--user-data-dir=${userDataDir}`],
    });
  }

  if (targets.length === 0) {
    throw new Error(
      'Unable to resolve Electron launch target. Run `yarn package` first.',
    );
  }

  return targets;
}

async function launchWithTarget(
  launchTarget: LaunchTarget,
  env: NodeJS.ProcessEnv,
): Promise<ElectronApplication> {
  const app = await electron.launch({
    args: launchTarget.args,
    env,
  });

  try {
    await app.firstWindow({ timeout: WINDOW_DISCOVERY_TIMEOUT_MS });
    return app;
  } catch (error) {
    await app.close().catch((): undefined => undefined);
    throw error;
  }
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
  const launchTargets = await resolveLaunchTargets(userDataDir);

  const env = { ...process.env };
  // CRITICAL: VS Code / some terminals set ELECTRON_RUN_AS_NODE=1, which
  // makes Electron behave as plain Node.js (no process.type, no BrowserWindow).
  delete env.ELECTRON_RUN_AS_NODE;

  let app: ElectronApplication | null = null;
  const launchErrors: string[] = [];
  for (const launchTarget of launchTargets) {
    try {
      app = await launchWithTarget(launchTarget, env);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      launchErrors.push(`${launchTarget.label}: ${message}`);
    }
  }

  if (!app) {
    throw new Error(`Unable to launch Electron app. ${launchErrors.join(' | ')}`);
  }

  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()
      .filter((candidate) => candidate.webContents.getURL().startsWith('devtools://'))
      .forEach((candidate) => candidate.close());
  });

  // Disable CSS transitions/animations app-wide for the whole test run. Playwright
  // waits for elements to be "stable" (bounding box unchanged across frames) before
  // acting; DaisyUI's `.modal-open` opens with a transition, so under parallel-worker
  // CPU load the settle detection can stall past the timeout and flake actions like
  // `check()`/`click()` on a freshly-opened dialog. Removing motion makes elements
  // immediately stable — deterministic, not a retry-style mask. Injected at the source
  // launcher so every test (both `launchApp` and `launchElectronApp` callers) is covered.
  const mainWindow = app.windows().find((candidate) => !candidate.url().startsWith('devtools://'));
  if (mainWindow) {
    await mainWindow.waitForLoadState('domcontentloaded').catch((): undefined => undefined);
    await mainWindow
      .addStyleTag({
        content: `*, *::before, *::after {
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          scroll-behavior: auto !important;
        }`,
      })
      .catch((): undefined => undefined);
  }

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
  const processHandle = app.process();
  const forceKill = (): void => {
    if (processHandle.killed) {
      return;
    }
    processHandle.kill('SIGKILL');
  };

  await app
    .evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().forEach((candidate) => candidate.destroy());
    })
    .catch((): undefined => undefined);

  const closeEvent = app.waitForEvent('close', { timeout: APP_CLOSE_TIMEOUT_MS });
  void app.close().catch((): undefined => undefined);
  await closeEvent.catch(async () => {
    forceKill();
    await app.waitForEvent('close', { timeout: APP_CLOSE_TIMEOUT_MS }).catch((): undefined =>
      undefined
    );
  });

  if (options?.preserveUserDataDir) {
    return;
  }
  await fs
    .rm(userDataDir, { recursive: true, force: true })
    .catch((): undefined => undefined);
}
