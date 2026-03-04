# Test Parallelism & Performance

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
poolOptions: {
  threads: {
    minThreads: 2,
    maxThreads: Math.max(2, os.cpus().length - 1),
  },
},
```

**Why threads instead of the default forks?**
`forks` (child processes) boot a full Node.js process per worker — expensive. `threads`
(worker_threads) share the same V8 instance and just isolate module registries, which starts
much faster. With 47 test files, this saving compounds.

**Why is threads safe here?**
Every unit test file mocks all native modules (`better-sqlite3`, `electron`) using `vi.mock()` /
`vi.doMock()`. No real native addons are loaded. Vitest's default `isolate: true` gives each file
its own module registry even in thread mode, so cross-file state leakage cannot happen.

**Worker count formula**
`maxThreads = max(2, cpus - 1)` leaves one core for the OS and main process. `minThreads: 2`
ensures at least two files run concurrently even on dual-core machines.

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

### Workers

`playwright.config.ts` uses `workers: 2`. Each worker is an independent OS process that runs
one test file at a time. Two workers means two test files can run simultaneously, each with its
own Electron instance and its own SQLite database.

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

| File                             | Parallel-safe?         | Notes                                                                                                                                    |
| -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `app.test.ts`                    | Yes                    | Single test, fresh app per run                                                                                                           |
| `battlemaps.test.ts`             | Yes                    | Fresh app + unique world name per run                                                                                                    |
| `abilities.test.ts`              | Yes                    | Fresh app + unique world name per run                                                                                                    |
| `battlemap-runtime-play.test.ts` | Yes                    | Fresh app per run                                                                                                                        |
| `tokens.test.ts`                 | Yes                    | Fresh app + fresh world in `beforeEach`; `afterEach` cleans up                                                                           |
| `arc-act.test.ts`                | **Serial within file** | Uses `test.describe.configure({ mode: 'serial' })` — tests depend on each other's state. Runs in its own Playwright worker sequentially. |

### Adding new E2E tests

1. Use `launchApp()` and `closeApp()` from `tests/e2e/helpers/launchApp.ts` — never use
   `electron.launch()` directly in test files.
2. Use unique names (e.g., `Date.now()` suffix) for any database records created, so parallel
   runs never see each other's leftovers.
3. Clean up created records in `afterEach` / `finally`.
4. If your tests depend on each other's state, add `test.describe.configure({ mode: 'serial' })`
   at the top of the describe block.

---

## Tuning Guide

### My test suite got slower after the thread pool change

1. Check for any test that imports a real native module. The file will fail to load in thread
   mode. Add `vi.mock('the-module')` at the top.
2. If a specific file has ordering issues, add `// @vitest-environment jsdom` and use
   `sequence.shuffle: false` in `vitest.config.ts` to force deterministic ordering.

### I want more Playwright workers

Each worker launches a full Electron process (~200–400 MB RAM). On a 16 GB machine, `workers: 3`
is reasonable. Change `workers` in `playwright.config.ts` and run `yarn test:e2e` to verify
stability.

### I want to measure the improvement

```bash
# Unit test timing
time yarn test:unit:run

# E2E timing (requires packaged build)
yarn package
time yarn test:e2e
```

Baseline (before thread pool): run once with `pool: 'forks'` (the default if you remove the
`pool` line) and record the time.

---

## Non-Goals / Deferred Work

### v8 Snapshots (mksnapshot)

v8 snapshots compile a subset of JavaScript into a binary heap snapshot that Electron can load
before the JS engine initialises. This reduces app cold-start time, not test suite time. It also
requires `electron-link` to remove incompatible CommonJS patterns from the snapshot source, and
is not compatible with `better-sqlite3` native binaries without significant wrapping. If pursued,
this should be a separate feature tracked in `docs/adr/`.

### Runtime DevTools Performance Overlay

Adding `performance.mark()` / `performance.measure()` calls to the renderer, or enabling
Chrome DevTools Performance recording, helps diagnose UI bottlenecks at runtime. This is a
renderer-side feature unrelated to test suite speed. Create a separate task when profiling
specific UI flows.

### Making `arc-act.test.ts` Parallel

The `arc-act.test.ts` tests flow state from one test to the next (world → campaign → arc → act →
session). Parallelising within this file would require full refactoring of the test data setup
into isolated fixtures. Track this as a test-quality improvement if the file becomes a bottleneck.
