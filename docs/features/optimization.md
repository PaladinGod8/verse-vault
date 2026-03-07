# Optimization Guide

This document covers two complementary optimization strategies in Verse Vault: **test suite
performance** and **packaged app size**. Each optimization addresses a specific performance
bottleneck in the development and deployment pipeline.

---

## Optimization Overview

| Area                  | Goal                       | Method                                                  | Impact                  |
| --------------------- | -------------------------- | ------------------------------------------------------- | ----------------------- |
| **Test Suite Speed**  | Reduce test execution time | Parallel execution + thread pool                        | ~2–3× faster test runs  |
| **Packaged App Size** | Reduce asar archive size   | Dependency reclassification + surgical packaging filter | ~10–15% smaller package |

Both optimizations leverage the same principle: **eliminate unnecessary work and resources**. They
are independent but complementary—apply both for maximum efficiency.

---

# Part 1: Test Parallelism & Performance

## Overview

The test suite has two independent runners:

| Runner           | Config file            | Parallelism mechanism                                       |
| ---------------- | ---------------------- | ----------------------------------------------------------- |
| Vitest (unit)    | `vitest.config.ts`     | Thread pool — each file runs in its own worker thread       |
| Playwright (E2E) | `playwright.config.ts` | Worker processes — each worker runs one test file at a time |

---

## Unit Tests (Vitest)

### Pool: threads

`vitest.config.ts` uses `pool: 'threads'` with:

```ts
pool: 'threads',
maxWorkers: Math.max(2, os.cpus().length - 1),
```

**Why threads instead of the default forks?**
`forks` (child processes) boot a full Node.js process per worker — expensive. `threads`
(worker_threads) share the same V8 instance and just isolate module registries, which starts
much faster with many test files.

**Why is threads safe here?**
Every unit test file mocks all native modules (`better-sqlite3`, `electron`) using `vi.mock()` /
`vi.doMock()`. No real native addons are loaded. Vitest's default `isolate: true` gives each file
its own module registry even in thread mode, so cross-file state leakage cannot happen.

**Worker count formula**
`maxWorkers = max(2, cpus - 1)` leaves one core for the OS and main process, ensuring at least
two test files run concurrently even on dual-core machines.

### Which tests are parallel-safe?

All 47 unit test files are parallel-safe at the file level. The breakdown:

| Category            | Files                                          | Reason                                                                     |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Pure functions      | `runtimeMath.test.ts`, `ipcChannels.test.ts`   | No mocks, no state — fully isolated                                        |
| Renderer components | All `renderer/*.test.tsx` files                | Mock `window.db` in `beforeEach`; jsdom is per-file                        |
| Store               | `exampleStore.test.ts`                         | `beforeEach` resets Zustand state                                          |
| Preload             | `preload.test.ts`                              | `beforeEach` calls `vi.resetModules()` + `vi.clearAllMocks()`              |
| DB layer            | `db.test.ts`, `tokens.test.ts`, `main.test.ts` | Use `vi.resetModules()` / `importMainWithMocks()` per test within the file |

Within each file, tests run sequentially (Vitest always does this). Tests that call
`vi.resetModules()` between cases are safe because the reset only touches the current worker's
module registry.

### Adding new unit tests

- Place the file under `tests/unit/`.
- Mock any native module at the top of the file with `vi.mock('...')` or `vi.doMock('...')`.
- Do not import `electron` or `better-sqlite3` directly — mock them.
- The new file will automatically run in parallel with all other files.

---

## E2E Tests (Playwright)

### Worker Group Strategy

`playwright.config.ts` groups E2E tests by weight/complexity into three projects, each with its
own parallelization strategy:

| Project   | fullyParallel | Files                                                                                                                               | Strategy                             |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `smoke`   | `true`        | `app.test.ts`, `statblocks-crud.test.ts`, `statblocks.test.ts`                                                                     | Lightweight fast tests — max workers |
| `medium`  | `true`        | `abilities.test.ts`, `battlemaps.test.ts`, `world-statistics-config.test.ts`, `statblock-statistics.test.ts`, `casting-range-overlay.test.ts`, `tokenMove.test.ts` | Medium-weight tests — max workers    |
| `runtime` | `false`       | `arc-act.test.ts`, `battlemap-runtime-play.test.ts`, `tokens.test.ts`                                                              | Heavy flows — conservative workers   |

Each worker is an independent OS process that runs one test file at a time, with its own Electron
instance and SQLite database. `fullyParallel: true` enables Playwright to distribute tests across
all available workers; `fullyParallel: false` limits parallelization within the project.

**Why group by weight?**
Playwright's default worker allocation distributes tests evenly, but this can cause resource
contention when heavy tests run concurrently. Grouping by weight and using targeted
parallelization (smoke/medium fully parallel, runtime conservative) provides more predictable
performance and reduces flakiness from resource exhaustion.

### Database isolation via `--user-data-dir`

All E2E tests launch via `tests/e2e/helpers/launchApp.ts`:

```ts
export async function launchApp(): Promise<LaunchResult> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vv-e2e-'));
  // ...
  const app = await electron.launch({
    args: [mainJs, `--user-data-dir=${userDataDir}`],
    env,
  });
  return { app, userDataDir };
}
```

Electron's `--user-data-dir` flag redirects `app.getPath('userData')` to the given path, so the
SQLite database (`verse-vault.db`) is created inside the temp dir. Each worker gets a unique
temp dir from `os.tmpdir()` + `mkdtemp`, preventing any two parallel workers from writing to the
same file.

Cleanup is handled by `closeApp(app, userDataDir)`:

```ts
export async function closeApp(app, userDataDir): Promise<void> {
  await app.close().catch(() => undefined);
  await fs
    .rm(userDataDir, { recursive: true, force: true })
    .catch(() => undefined);
}
```

### Which E2E files run in parallel?

All E2E test files are parallel-safe at the file level through database isolation (see next
section). Files are grouped by weight into projects:

- **Smoke/Medium projects** (`fullyParallel: true`) — Playwright distributes these across all
  available workers. Each test file runs independently with its own Electron app and database.
- **Runtime project** (`fullyParallel: false`) — Conservative parallelization for heavier flows.

**One exception:** `arc-act.test.ts` uses `test.describe.configure({ mode: 'serial' })` to run
tests sequentially within the file, since the tests depend on each other's state (world →
campaign → arc → act → session). The file still runs independently from other test files with
its own isolated database.

### Adding new E2E tests

1. Use `launchApp()` and `closeApp()` from `tests/e2e/helpers/launchApp.ts` — never use
   `electron.launch()` directly in test files.
2. Use unique names (e.g., `Date.now()` suffix) for any database records created, so parallel
   runs never see each other's leftovers.
3. Clean up created records in `afterEach` / `finally`.
4. Add the new test file to the appropriate project in `playwright.config.ts`:
   - **smoke**: Lightweight, fast tests (< 5 assertions, single feature)
   - **medium**: Standard tests with typical setup/teardown
   - **runtime**: Complex multi-step flows or heavy interaction tests
5. If your tests depend on each other's state, add `test.describe.configure({ mode: 'serial' })`
   at the top of the describe block.

---

## Test Suite Tuning Guide

### My test suite got slower after the thread pool change

1. Check for any test that imports a real native module. The file will fail to load in thread
   mode. Add `vi.mock('the-module')` at the top.
2. If a specific file has ordering issues, add `// @vitest-environment jsdom` and use
   `sequence.shuffle: false` in `vitest.config.ts` to force deterministic ordering.

### I want more Playwright parallelization

Each worker launches a full Electron process (~200–400 MB RAM). Playwright defaults to CPU-based
worker allocation. To override:

```typescript
// In playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 1 : undefined, // explicit override
  // ...
});
```

For local development, leave `workers` undefined (Playwright auto-scales). On a 16 GB machine,
tests should run stably with default settings. Monitor resource usage with Task Manager if you
see flakiness.

### I want to measure the improvement

```bash
# Unit test timing
yarn test:unit:run

# E2E timing (requires packaged build)
yarn package
yarn test:e2e
```

Baseline to compare: run once with `pool: 'forks'` in `vitest.config.ts` (remove the `pool`
line) and record the time.

---

## Test Suite Non-Goals / Deferred Work

### v8 Snapshots (mksnapshot)

v8 snapshots compile a subset of JavaScript into a binary heap snapshot that Electron can load
before the JS engine initialises. This reduces app cold-start time, not test suite time. It also
requires `electron-link` to remove incompatible CommonJS patterns from the snapshot source, and
is not compatible with `better-sqlite3` native binaries without significant wrapping. If pursued,
this should be a separate feature tracked in an ADR.

### Runtime DevTools Performance Overlay

Adding `performance.mark()` / `performance.measure()` calls to the renderer, or enabling Chrome
DevTools Performance recording, helps diagnose UI bottlenecks at runtime. This is a renderer-side
feature unrelated to test suite speed. Create a separate task when profiling specific UI flows.

### Making `arc-act.test.ts` Parallel

The `arc-act.test.ts` tests flow state from one test to the next (world → campaign → arc → act →
session). Parallelizing tests within this file would require full refactoring of the test data
setup into isolated fixtures. The file is currently in the `runtime` project with
`fullyParallel: false`, and uses `test.describe.configure({ mode: 'serial' })` to ensure tests
run sequentially. Track this as a test-quality improvement if the file becomes a bottleneck.

---

# Part 2: Package Build Optimization

## Overview

This optimization reduces the size of the packaged Electron app (`verse-vault.asar`) by ensuring
that only runtime-required packages are included. The optimization reclassifies build-time and
renderer-only dependencies in `package.json`, introduces an explicit packaging filter
(`forge.ignore.ts`), and leverages Vite's bundling to eliminate unnecessary files from the asar.

---

## Problem

### The Issue

The original `package.json` had many packages misclassified as runtime `dependencies` that are
actually only needed at compile time or are already bundled by Vite:

- **Renderer libraries** (`react`, `react-dom`, `react-router-dom`, `pixi.js`, `zustand`,
  `@dnd-kit/*`) — Vite fully bundles these into `.vite/renderer/main_window/` with no `external`
  list. They do not need to exist in `node_modules` at runtime.
- **Type definitions** (`@types/react`, `@types/react-dom`) — TypeScript types used only during
  compilation.
- **Build plugins** (`@rollup/plugin-commonjs`) — Vite/Rollup plugins used only during the build
  step.
- **Unused packages** (`electron-util`, `cli-progress-bar`) — Not imported anywhere in the
  codebase.

Electron Packager runs with `prune: true` by default, which removes `devDependencies` from
`node_modules` before packaging. However, because these packages were incorrectly in
`dependencies`, they survived the prune step and inflated the final asar unnecessarily.

Additionally, the packaging ignore filter in `forge.config.ts` used a broad include list
(`['/.vite', '/node_modules', '/package.json']`), which included all of node_modules. Defensive
hardening: we now explicitly list only the packages known to be needed at runtime.

---

## What Changed

### 1. Dependency Reclassification (`package.json`)

The following packages were moved from `dependencies` to `devDependencies`:

| Package                   | Reason                                                  |
| ------------------------- | ------------------------------------------------------- |
| `@types/react`            | TypeScript type declarations — compile-time only        |
| `@types/react-dom`        | TypeScript type declarations — compile-time only        |
| `@rollup/plugin-commonjs` | Vite/Rollup build plugin — build-time only              |
| `react`                   | Vite bundles fully; no runtime import from main process |
| `react-dom`               | Vite bundles fully; no runtime import from main process |
| `react-router-dom`        | Vite bundles fully; no runtime import from main process |
| `pixi.js`                 | Vite bundles fully; no runtime import from main process |
| `zustand`                 | Vite bundles fully; no runtime import from main process |
| `@dnd-kit/core`           | Vite bundles fully; no runtime import from main process |
| `@dnd-kit/sortable`       | Vite bundles fully; no runtime import from main process |
| `@dnd-kit/utilities`      | Vite bundles fully; no runtime import from main process |
| `electron-util`           | Not imported anywhere in `src/`                         |
| `cli-progress-bar`        | Not imported anywhere in `src/`                         |

**Packages kept in `dependencies` (runtime-required):**

| Package                     | Reason                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `better-sqlite3`            | Native module; imported by `src/database/db.ts` and loaded in the main process at runtime |
| `electron-squirrel-startup` | Imported in `src/main.ts` (line 387) to handle Windows Squirrel startup events            |

### 2. Packaging Ignore Filter (`forge.ignore.ts`)

A new file, `forge.ignore.ts`, at the repository root exports the packaging filter logic:

```typescript
export const PACKAGE_INCLUDE = [
  '/.vite',
  '/node_modules/better-sqlite3',
  '/node_modules/electron-squirrel-startup',
  '/package.json',
] as const;

export function isIgnoredFromPackage(path: string): boolean {
  if (path === '') return false;
  const included = PACKAGE_INCLUDE.some((prefix) => path.startsWith(prefix));
  if (!included) return true;
  return path.includes('/.bin/');
}
```

**What this does:**

- **`PACKAGE_INCLUDE`** lists the path prefixes that are included in the asar:
  - `/.vite` — Vite build output (main process, preload, renderer bundles)
  - `/node_modules/better-sqlite3` — Runtime database driver
  - `/node_modules/electron-squirrel-startup` — Windows Squirrel event handler
  - `/package.json` — Metadata required by Electron Packager
- **`isIgnoredFromPackage(path)`** returns `true` if a path should be excluded from the asar,
  `false` if included:
  - Empty string (`''`, the root) is always included (Electron Packager convention)
  - Paths starting with any prefix in `PACKAGE_INCLUDE` are included, **unless** they contain
    `/.bin/` (binary shims are excluded)
  - All other paths are excluded

This surgical approach prevents future accidental misclassifications of dependencies from
silently inflating the package.

### 3. Forge Config Update (`forge.config.ts`)

The config now imports and uses `isIgnoredFromPackage`:

```typescript
import { isIgnoredFromPackage } from './forge.ignore';

// In packagerConfig:
ignore: isIgnoredFromPackage,
```

Previously, the filter was an inline function. Now it is imported from the separate, testable
`forge.ignore.ts` file.

---

## Why Renderer Dependencies Are Safe to Move

All renderer dependencies (`react`, `pixi.js`, zustand, `@dnd-kit/*`, `react-router-dom`) are
safely moved to `devDependencies` because:

1. **`vite.renderer.config.ts` has no `external` list** — This means Vite does not treat any npm
   packages as external; instead, it recursively bundles all imports into
   `.vite/renderer/main_window/main.js`.
2. **Result:** React, pixi.js, zustand, and other renderer libraries are fully bundled into the
   JavaScript output at build time.
3. **At runtime:** The main process never imports these packages. The renderer process only needs
   the pre-bundled `.vite/renderer/main_window/` directory and the IPC bridge (`window.db`). The
   source packages themselves are not needed in `node_modules`.

Therefore, including these packages in the runtime asar is wasteful. Keeping them in
`devDependencies` ensures they are available during development and testing (e.g., for unit
tests with jsdom), but Electron Packager's `prune: true` removes them from the final asar.

---

## Build Optimization Verification

After the packaging optimization is in place, use these commands to confirm correctness:

```bash
# Rebuild and package the app
yarn install
yarn package

# Inspect the asar to confirm packaging worked
# (optional, requires 'asar' CLI: npm install -g asar)

# List node_modules contents in the packaged app:
asar list out/verse-vault-*/resources/app.asar | grep node_modules

# Expected output:
# node_modules/better-sqlite3/  (present)
# node_modules/electron-squirrel-startup/  (present)
# node_modules/  (directory exists, but only the above two packages)

# Confirm the packaged app launches and core flows work:
yarn test:e2e

# Confirm renderer bundle includes React (to ensure Vite bundling worked):
ls -la .vite/renderer/main_window/
# Should contain: main.js (with bundled React, pixi.js, etc.)
```

**Expected results:**

- `node_modules/react` is **absent** from the asar
- `node_modules/better-sqlite3` is **present** in the asar (native module)
- `node_modules/electron-squirrel-startup` is **present** in the asar (Windows only, but
  included for all platforms)
- E2E tests pass with the packaged app
- `.vite/renderer/main_window/main.js` is present and contains bundled dependencies

---

## Build Optimization Non-Goals

The following are **explicitly out of scope** for this optimization:

- **No changes to Vite build pipeline** — The `external` const in `vite.base.config.ts` is
  unchanged. It now correctly reads only runtime dependencies from `pkg.dependencies` (due to
  the dependency reclassification), but the build logic itself is not modified.
- **No changes to asar unpacking configuration** — `better-sqlite3` is a native module and
  requires unpacking from the asar at runtime. This is handled separately by the
  `@electron-forge/plugin-auto-unpack-natives` plugin.
- **No changes to Electron security fuses** — The `contextIsolation`, `nodeIntegration`, and
  other security boundaries remain unchanged.
- **No changes to rebuild configuration** — The `postinstall` hook still runs `electron-rebuild`
  for `better-sqlite3`.
- **Not a performance improvement to `yarn install`** — This optimization affects only the
  packaged app size, not installation speed. The rebuild of `better-sqlite3` is a separate
  concern.

---

## Related Files

### Build Optimization

- **`forge.ignore.ts`** — Source of truth for the packaging filter; defines `PACKAGE_INCLUDE` and
  `isIgnoredFromPackage`
- **`forge.config.ts`** — Consumes `isIgnoredFromPackage` as the `packagerConfig.ignore`
  function
- **`package.json`** — Reclassified dependencies; runtime packages now live here only:
  `better-sqlite3`, `electron-squirrel-startup`
- **`vite.renderer.config.ts`** — Confirms renderer has no `external` list (all deps are
  bundled)
- **`vite.base.config.ts`** — Contains the `external` const, which now correctly includes only
  runtime deps (reads from `pkg.dependencies`)
- **`tests/unit/forge-ignore.test.ts`** — Unit tests for the `isIgnoredFromPackage` function

### Test Optimization

- **`vitest.config.ts`** — Unit test pool configuration
- **`playwright.config.ts`** — E2E test worker configuration
- **`tests/unit/`** — Unit test files (parallel-safe)
- **`tests/e2e/`** — E2E test files (parallel-safe with isolation)
- **`tests/e2e/helpers/launchApp.ts`** — App launcher with `--user-data-dir` isolation
