# GitHub Actions CI Setup

## Summary

The repository uses a single GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on a Windows self-hosted runner. This replaces the Jenkins pipeline.

## Workflow Triggers

- `push` to `main`
- `pull_request` targeting `main`
- `workflow_dispatch` (manual run from GitHub Actions UI)

## Pipeline Stages

Mirrors the Jenkinsfile exactly:

| Stage | Command |
|---|---|
| Install | `yarn install --frozen-lockfile` |
| Rebuild native modules | `yarn postinstall` |
| Format check | `yarn format:check` |
| Type check | `yarn type-check` |
| Lint | `yarn lint` |
| Unit tests + coverage | `yarn test:unit:coverage` |
| Package for e2e | `yarn package` |
| E2E tests | `yarn test:e2e` |

Coverage and Playwright reports are uploaded as artifacts (10-day retention) even on failure.

## Critical Environment Variables

`ELECTRON_RUN_AS_NODE: ''` is set at the workflow level. Without this, VS Code and some CI environments set `ELECTRON_RUN_AS_NODE=1`, which causes Electron to behave as plain Node.js — no `process.type`, no Electron APIs, app crashes immediately. See also: `MEMORY.md` and `docs/features/pipeline-terminal-log-capture.md`.

## Self-Hosted Runner Setup (Windows)

### Prerequisites

Install these on the runner machine before registering the runner:

1. **Node.js** — LTS (18+). Download from nodejs.org.
2. **Yarn** — `npm install -g yarn`
3. **Git** — git-scm.com
4. **Visual Studio Build Tools** — required for node-gyp (compiles `better-sqlite3`).
   - Download "Build Tools for Visual Studio" from visualstudio.microsoft.com
   - Select workload: **Desktop development with C++**
   - This installs MSVC compiler, Windows SDK, and CMake
5. **Python 3** — required by node-gyp. python.org (check "Add to PATH" during install)

### Register the Runner

1. Go to your GitHub repo → **Settings** → **Actions** → **Runners** → **New self-hosted runner**
2. Select **Windows** / **x64**
3. Follow the displayed PowerShell commands to download and extract the runner
4. Run the config command shown (includes your repo URL and a one-time token):
   ```powershell
   ./config.cmd --url https://github.com/OWNER/REPO --token YOUR_TOKEN
   ```
5. Accept defaults for runner name and work folder, or customize as needed

### Run the Runner

**Interactive (foreground)** — useful for first-time testing:
```powershell
./run.cmd
```

**As a Windows service** — runs automatically on boot, even when no user is logged in:
```powershell
./svc.cmd install
./svc.cmd start
```

> **Note for Electron/Playwright**: E2E tests open a real Electron window. If running as a service under the `SYSTEM` account, the window may not appear and tests can fail. If you hit this, run the runner interactively under your normal user account instead, or configure the service to run as your user account via `services.msc`.

### Verify the Runner

After starting, the runner should appear as **Idle** in **Settings → Actions → Runners**. Trigger a push or use the manual `workflow_dispatch` trigger to confirm the workflow runs end-to-end.

## Migration from Jenkins

| Jenkins | GitHub Actions equivalent |
|---|---|
| `Jenkinsfile` pipeline | `.github/workflows/ci.yml` |
| `publishHTML` for coverage | `actions/upload-artifact` → coverage-report |
| `publishHTML` for Playwright | `actions/upload-artifact` → playwright-report |
| `FRESH_INSTALL` parameter | `workflow_dispatch` (always installs on CI) |
| `buildDiscarder(numToKeepStr: '10')` | `retention-days: 10` on artifacts |
| `timestamps()` | Built-in to GitHub Actions log viewer |

The `Jenkinsfile` can be removed once the self-hosted runner is confirmed working.

## Local Development

`scripts/verify-all.cjs` remains the local pre-push tool (`yarn verify:all`). It is not replaced by GitHub Actions — it handles local log capture, auto-format, and the optional dev-app step.

## Related Files

- `.github/workflows/ci.yml` — workflow definition
- `scripts/verify-all.cjs` — local pipeline runner
- `docs/features/pipeline-terminal-log-capture.md` — log capture behavior
