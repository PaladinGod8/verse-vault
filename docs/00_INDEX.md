# Verse Vault - Re-entry Index

## Quick Start

```bash
yarn install        # installs deps + rebuilds native modules (postinstall)
yarn start          # dev mode with hot reload
yarn lint           # ESLint check (cached default, strict --max-warnings=0)
yarn lint:full      # ESLint full uncached run (debug cache-related lint issues)
yarn lint:changed   # ESLint changed-file mode (primarily CI pull_request path)
yarn format:check   # dprint check (no writes)
yarn format         # auto-format with dprint
```

## Workflow Gates

```bash
yarn verify:rapid      # fast local preflight (parallel checks)
yarn verify:all        # strict local gate (sequential full checks)
yarn verify:all:dev    # strict gate + launches dev app at the end
yarn test:e2e          # local e2e (packages first, then runs Playwright)
yarn test:e2e:local    # local alias of test:e2e
yarn test:e2e:local:8  # local-only e2e with PLAYWRIGHT_WORKERS=8
```

Use `verify:rapid` during iteration, then `verify:all` before push/PR.

## GitHub Actions Paper Trail

On push/PR/manual runs targeting `main`, `.github/workflows/ci.yml` runs CI on the self-hosted runner:

- `fast-checks` matrix (`format`, `typecheck`, `lint`, `unit`)
  - Lint mode selection:
    - `pull_request`: runs `yarn lint:changed` (PR diff-aware lint for faster feedback)
    - `push`/`workflow_dispatch`: runs `yarn lint` (full strict lint gate)
- `package`
- `e2e` (after `package`)
- `ci-summary` final status gate

CI optimizations (applied to all jobs):

- `fetch-depth: 1` on all checkout steps (tip commit only; no full history fetch)
- `paths-ignore` on push/pull_request: commits touching only `docs/**`, `*.md`, or `.github/CODEOWNERS` skip CI
- Yarn download cache: `actions/cache@v4` keyed by `runner.os + yarn.lock hash`; `node_modules` is NOT cached (native module safety)

Primary debugging paper trail:

- GitHub Actions workflow/job/step logs
- `coverage-report` artifact
- `packaged-app` artifact
- `playwright-report` artifact

### Runner Operations (Windows PowerShell)

From repository root (`c:\code\personal\verse-vault`):

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
- If PowerShell execution policy blocks `yarn.ps1`, use `cmd /c yarn ...`.

### Watch Current CI Run (Terminal)

```bash
gh run list -R PaladinGod8/verse-vault --limit 10
gh run watch -R PaladinGod8/verse-vault --compact --exit-status
```

## Product Direction

Verse Vault is being built as a centralized, offline-first desktop platform for:

- TTRPG campaign management
- Creative writing workflows
- Worldbuilding knowledge systems

Core design intent:

- One local workspace for campaign operations, lore, notes, and manuscript drafting
- Local-first data ownership with no cloud dependency for core workflows
- Expandable entity model for campaign, world, manuscript, and session domains

## Where to Start Reading

| Question                          | File                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| How does the app boot?            | [src/main.ts](../src/main.ts)                                    |
| What APIs does the renderer have? | [src/preload.ts](../src/preload.ts) -> `window.db`               |
| What routes/pages exist?          | [src/renderer/App.tsx](../src/renderer/App.tsx)                  |
| What's in the database?           | [src/database/db.ts](../src/database/db.ts)                      |
| What IPC channel names exist?     | [src/shared/ipcChannels.ts](../src/shared/ipcChannels.ts)        |
| Global TS types                   | [forge.env.d.ts](../forge.env.d.ts) (`Verse` scaffold + `DbApi`) |

## Docs

- [01_ARCHITECTURE.md](01_ARCHITECTURE.md) - data-flow diagram + security rules
- [02_CODEBASE_MAP.md](02_CODEBASE_MAP.md) **(LIVING)** - where to change things
- [03_IPC_CONTRACT.md](03_IPC_CONTRACT.md) **(LIVING)** - all IPC channels and payloads
- [05_BUILD_RELEASE.md](05_BUILD_RELEASE.md) - packaging and release
- [06_AGENTIC_TESTING_QUALITY_GATE.md](06_AGENTIC_TESTING_QUALITY_GATE.md) - cross-agent final testing prompt
- [CHECKLIST.md](CHECKLIST.md) - feature workflow
- [TODO.md](TODO.md) - roadmap and backlog
- [adr/](adr/) - architectural decision records

## Key Facts

- **Stack**: Electron 35 / React 19 / Vite 6 / TypeScript / better-sqlite3 12 / Tailwind CSS v4 / Zustand 5 / React Router 7
- **DB file location**: `%APPDATA%\\Verse Vault\\verse-vault.db` (Windows userData)
- **Routing**: HashRouter (no web server needed)
- **Client state**: Zustand stores in `src/store/` (pattern exists, not yet wired to feature domains)
- **Package manager**: Yarn 1.22
- **Offline-first baseline**: SQLite + IPC architecture keeps core capabilities local by default
