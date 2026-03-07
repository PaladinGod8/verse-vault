# Pipeline Terminal Log Capture

## Summary

`yarn verify:all*` now writes full terminal output and run metadata to stable in-repo artifacts so failed pipeline runs can be debugged without rerunning immediately.

## Commands

From `package.json`:

- `yarn verify:all` -> `node scripts/verify-all.cjs --no-dev`
- `yarn verify:all:dev` -> `node scripts/verify-all.cjs`
- `yarn verify:all:fresh` -> `node scripts/verify-all.cjs --install --no-dev`
- `yarn verify:all:dev:fresh` -> `node scripts/verify-all.cjs --install`

## Log Storage Model

All logs are written under:

- `docs/logs/pipeline/` (gitignored)

Per-run artifacts:

- `docs/logs/pipeline/runs/<runId>/run.log` (full combined terminal stream)
- `docs/logs/pipeline/runs/<runId>/run.json` (metadata for that run)
- `docs/logs/pipeline/runs/<runId>/<step>.stdout.log` (per-command stdout)
- `docs/logs/pipeline/runs/<runId>/<step>.stderr.log` (per-command stderr)
- `docs/logs/pipeline/runs/<runId>/<step>.log` (per-command combined)

Latest-run pointers (always updated at end of a run, pass or fail):

- `docs/logs/pipeline/latest.log`
- `docs/logs/pipeline/latest.json`

## Latest-Run Behavior

- Every run creates a unique `<runId>` directory (`YYYYMMDD-HHMMSS-mmm`).
- `latest.json` is rewritten with the newest run metadata.
- `latest.log` is copied from that run's `run.log`.
- Older `runs/<runId>/` folders remain available for historical debugging.

## Failure Triage Workflow

1. Run one of the `verify:all*` commands.
2. Open `docs/logs/pipeline/latest.json` and check:
   - `status`
   - `failedStep.name`
   - `steps[].commands[].logs` paths
3. Open `docs/logs/pipeline/latest.log` for full chronology.
4. Open the failed command's `stdout`, `stderr`, and combined logs in `runs/<runId>/` to isolate the root cause.
5. Re-run the pipeline and confirm `latest.*` now points to the new run.

## Common Troubleshooting Cases

- **Pipeline says formatting issues found**: expected behavior; the script may run `yarn format` and then re-check formatting in the same run.
- **Run fails before later checks execute**: expected; pipeline stops at first failing step and marks `status: "failed"` with `failedStep`.
- **No logs found in Git history**: expected; `docs/logs/` is ignored by `.gitignore`.
- **Windows cleanup warnings (`EBUSY`, `EPERM`, `ENOTEMPTY`)**: script retries cleanup for `coverage/`, `test-results/`, and `playwright-report`; close locking processes (for example an open report window) and rerun if needed.

## Process Explorer

Each pipeline step spawns a specific process tree. This is the full process hierarchy across all steps:

### Step 1 — Install Dependencies (`--install` flag only)

```
verify-all.cjs (Node.js)
└── yarn install --check-files
    └── node [yarn v1]
        └── package extraction, hoisting, lifecycle scripts
```

### Step 2 — Postinstall: Native Module Rebuild

```
verify-all.cjs (Node.js)
└── yarn postinstall
    └── electron-rebuild -f -w better-sqlite3
        └── node-gyp rebuild
            └── C++ compiler (cl.exe / gcc / clang)
                └── better-sqlite3.node (native addon output)
```

### Step 3 — Format Check / Auto-Fix

```
verify-all.cjs (Node.js)
├── dprint check               ← first pass (allowFailure: true)
├── dprint fmt                 ← only if first pass fails
└── dprint check               ← re-check after auto-fix
```

> dprint is a Rust binary; each invocation is a single short-lived process.

### Step 4 — TypeScript Type Check

```
verify-all.cjs (Node.js)
└── tsc --noEmit
    └── TypeScript compiler (Node.js)
        └── type-checks all .ts/.tsx files; emits nothing
```

### Step 5 — Lint

```
verify-all.cjs (Node.js)
└── eslint --ext .ts,.tsx . --max-warnings=0
    └── ESLint (Node.js)
        └── parses + lints all TypeScript source files
```

### Step 6 — Unit Tests with V8 Coverage

```
verify-all.cjs (Node.js)
└── vitest run --coverage --pool=forks
    ├── Vitest runner (Node.js)
    │   ├── Worker fork 1 (Node.js, jsdom environment)
    │   ├── Worker fork 2 (Node.js, jsdom environment)
    │   └── … one fork per test file
    └── @vitest/coverage-v8 (V8 native instrumentation, merged at end)
```

> `--pool=forks` isolates each test file in its own Node.js fork.
> jsdom simulates a browser DOM — no Electron process is involved here.

### Step 7 — Package App for E2E

```
verify-all.cjs (Node.js)
└── electron-forge package
    ├── VitePlugin: build main
    │   └── Vite + Rollup (Node.js) → .vite/build/main.js (CJS)
    ├── VitePlugin: build preload
    │   └── Vite + Rollup (Node.js) → .vite/build/preload.js
    ├── VitePlugin: build renderer
    │   └── Vite + Rollup (Node.js) → .vite/renderer/main_window/
    └── ASAR packager
        └── @electron/asar → out/verse-vault-<platform>/resources/app.asar
            └── native unpacking: better-sqlite3.node → app.asar.unpacked/
```

### Step 8 — E2E Tests

```
verify-all.cjs (Node.js)
└── playwright test
    └── Playwright test runner (Node.js)
        └── Electron app (launched via playwright/_electron)
            ├── Electron main process  (Node.js-like; IPC, DB, contextBridge)
            │   └── better-sqlite3.node (native module from asar.unpacked/)
            ├── Electron renderer process  (Chromium; isolated context, no Node)
            └── Electron GPU process  (Chromium GPU helper)
```

> `ELECTRON_RUN_AS_NODE` must NOT be set — VS Code terminals set it by default
> which makes Electron run as plain Node.js, bypassing all Electron APIs.
> `verify-all.cjs` does not unset this automatically; Playwright config must handle it.

### Step 9 — Dev App (no `--no-dev` flag only)

```
verify-all.cjs (Node.js)
└── electron-forge start
    ├── VitePlugin: renderer dev server (Node.js, HMR on port 5173)
    ├── VitePlugin: main watcher
    │   └── Nodemon → restarts Electron on main/preload source changes
    └── Electron app
        ├── Electron main process  (Node.js-like; IPC, DB, contextBridge)
        │   └── better-sqlite3.node (native module, loaded directly)
        ├── Electron renderer process  (Chromium; DevTools open by default)
        └── Electron GPU process
```

## Related Components

- `scripts/verify-all.cjs` (capture and persistence logic)
- `tests/unit/scripts/verify-all.test.ts` (behavior coverage for run artifacts and latest pointers)
- `package.json` (`verify:all*` script entrypoints)
