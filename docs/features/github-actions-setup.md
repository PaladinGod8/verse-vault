# GitHub Actions CI Setup

## Summary

The repository uses a parallel GitHub Actions workflow (`.github/workflows/ci.yml`) on a Windows self-hosted runner.
Independent quality gates run concurrently, while required sequencing (`package` -> `e2e`) remains enforced.

## Workflow Triggers

- `push` to `main`
- `pull_request` targeting `main`
- `workflow_dispatch` (manual run from GitHub Actions UI)

## Pipeline Graph

| Job                    | Purpose                                                              | Parallel/Sequence                               |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `bootstrap`            | Shared setup baseline (Node, cache restore, install, native rebuild) | First                                           |
| `fast-checks` (matrix) | `format`, `typecheck`, `lint`, `unit`                                | Parallel (`fail-fast: false`)                   |
| `package`              | `yarn package`                                                       | Parallel with `fast-checks` (after `bootstrap`) |
| `e2e`                  | Downloads packaged artifact and runs `yarn test:e2e:ci`              | Sequential after `package`                      |
| `ci-summary`           | Final workflow status gate                                           | Runs last (`if: always()`)                      |

### Why this catches more errors per run

- `fast-checks` uses a matrix and `fail-fast: false`, so each gate reports independently.
- `package` runs in parallel with fast checks, so packaging failures are visible even if lint/unit fail.
- `e2e` still runs only after packaging succeeds.
- `ci-summary` evaluates upstream job results at the end so the paper trail is preserved.

### Artifacts and paper trail

- Workflow/job/step logs in GitHub Actions are the primary debugging paper trail.
- Coverage report: `coverage-report`
- Packaged build artifact: `packaged-app`
- Playwright report: `playwright-report`

## Critical Environment Variables

- `ELECTRON_RUN_AS_NODE: ''` prevents Electron from being forced into plain Node.js mode.
- `PLAYWRIGHT_HTML_OPEN: never` avoids opening report UI in CI.
- `YARN_ENABLE_GLOBAL_CACHE: 'true'` improves cache reuse consistency.

## Caching Strategy

### Dependency cache

- Uses `actions/setup-node@v4` with `cache: yarn`.
- Cache key is tied to `yarn.lock` and runner/node environment.

### Tool cache

Uses `actions/cache@v4` for:

- `.vite`
- `node_modules/.cache/eslint`

Key includes:

- OS
- Node version
- `yarn.lock`
- `package.json`
- `vite.*.config.ts`
- `vitest.config.ts`
- `playwright.config.ts`

This limits stale/mismatched cache reuse when dependencies or build/test configs change.

## Self-Hosted Runner Setup (Windows)

### Prerequisites

Install these on the runner machine before registering the runner:

1. **Node.js** - LTS (20+ preferred for this workflow)
2. **Yarn** - `npm install -g yarn`
3. **Git** - git-scm.com
4. **Visual Studio Build Tools** - required for node-gyp (`better-sqlite3`), with workload **Desktop development with C++**
5. **Python 3** - required by node-gyp

### Register the Runner

1. Go to your GitHub repo -> **Settings** -> **Actions** -> **Runners** -> **New self-hosted runner**
2. Select **Windows** / **x64**
3. Follow the shown PowerShell commands to download and extract the runner
4. Run the config command shown by GitHub

### Run the Runner

Interactive (foreground):

```powershell
./run.cmd
```

Service mode:

```powershell
./svc.cmd install
./svc.cmd start
```

If Electron e2e cannot open correctly in service mode, run interactively under your user account.

### Multi-runner service commands

Use repository-local commands from repo root (`c:\code\personal\verse-vault`):

```bash
cmd /c yarn runner:status
cmd /c yarn runner:start
cmd /c yarn runner:stop
cmd /c yarn runner:restart
```

Direct PowerShell equivalent:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action start
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action stop
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action restart
```

Notes:
- `start` / `stop` / `restart` auto-request elevation (UAC) when needed.
- This removes the old requirement to manually open an admin terminal and `cd` into `C:\code\action-runners\`.
- If PowerShell execution policy blocks `yarn.ps1`, use `cmd /c yarn ...`.

### Watch current pipeline in terminal

```bash
# list recent runs
gh run list -R PaladinGod8/verse-vault --limit 10

# watch latest in-progress run live
gh run watch "$(gh run list -R PaladinGod8/verse-vault --status in_progress --limit 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault --exit-status
```

## Local Development

Two local verification modes are available:

- Full strict gate: `yarn verify:all`
- Rapid fast gate: `yarn verify:rapid`
- Primary local e2e command: `yarn test:e2e` (packages first, then runs Playwright)
- E2E local worker override examples:
  - `yarn test:e2e:local` (alias of `yarn test:e2e`)
  - `yarn test:e2e:local:8` (sets `PLAYWRIGHT_WORKERS=8` locally)

CI runs `yarn test:e2e:ci` so it reuses the packaged artifact from the `package` job and avoids packaging twice.

### Rapid mode details

`yarn verify:rapid` runs these in parallel:

- `yarn format:check`
- `yarn type-check`
- `yarn lint:cache`
- `yarn test:unit:quick`

Cache hygiene in rapid mode:

- It fingerprints `node`, `platform`, `arch`, `yarn.lock`, and `package.json`.
- On mismatch, it clears local tool caches before running checks.

Additional commands:

- `yarn verify:rapid:fresh` (force cache reset)
- `yarn verify:rapid:rebuild` (run native rebuild first)

## Related Files

- `.github/workflows/ci.yml` - workflow definition
- `scripts/verify-all.cjs` - strict local sequential gate
- `scripts/verify-rapid.cjs` - local parallel fast gate with cache fingerprinting
