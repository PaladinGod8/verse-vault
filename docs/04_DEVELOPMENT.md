# Development Guide

Guide for local setup, daily dev commands, validation gates, and common troubleshooting.

## Environment Requirements

- Node.js 20 LTS (matches CI)
- Yarn 1.22.x (`yarn --version`)
- Git
- Gitleaks CLI on `PATH` for secret scanning in `verify:*`
- Optional for docs lint: Vale CLI on `PATH`

## First-Time Setup

1. Clone repo.
2. Install dependencies:

```bash
yarn install
```

Notes:

- `postinstall` runs native rebuild for `better-sqlite3`.
- On Windows, close any running Electron app before install/rebuild to avoid file lock errors.

## Getting Started (Run the App)

```bash
yarn start
```

Alias:

```bash
yarn dev
```

## Daily Command Reference

### Code Quality

```bash
yarn lint
yarn lint:code
yarn lint:docs
yarn docs:generate
yarn docs:check
yarn guard:contracts
yarn guard:e2e-timing
yarn format:check
yarn format
```

### Unit and E2E Tests

```bash
yarn test:unit:run
yarn test:unit:coverage
yarn test:e2e
yarn test:e2e:ci
```

### Verification Pipelines

```bash
yarn verify:rapid
yarn verify:smart
yarn verify:all
yarn verify:all:dev
yarn security:secrets
```

Fresh/rebuild variants:

```bash
yarn verify:rapid:fresh
yarn verify:rapid:rebuild
yarn verify:smart:fresh
yarn verify:all:rebuild
yarn verify:all:dev:rebuild
yarn verify:all:fresh
yarn verify:all:dev:fresh
```

Recommended cadence:

1. `yarn verify:rapid` while iterating.
2. `yarn verify:smart` when you want diff-aware docs/contracts/E2E selection.
3. `yarn verify:all` before push/PR.

Verification lane notes:

- `yarn verify:all` packages once, then runs `yarn test:e2e:ci`.
- `yarn verify:all` does not rebuild native modules unless you use a `:rebuild` or `:fresh` variant.
- `yarn verify:all:dev` uses Playwright config default workers unless you set `PLAYWRIGHT_WORKERS`.

Secret-scan scope:

- `yarn verify:rapid` and `yarn verify:smart` run a working-tree-only gitleaks pass.
- `yarn verify:all` runs working tree plus full git history.
- Ignore rules live in `.gitleaks.toml` for generated local artifacts like `out/` and `playwright-report/`.

## Targeted Test Runs

```bash
npx vitest <test-file-path> --no-file-parallelism --reporter=verbose
npx vitest <test-file-path> -t="<specific test name>" --no-file-parallelism --reporter=verbose
yarn test:unit:run --no-file-parallelism
```

## Packaging Commands

```bash
yarn package
yarn make
```

Build and release details: [05_BUILD_RELEASE.md](05_BUILD_RELEASE.md)

## Git Hook Guardrails

One-time setup:

```bash
yarn hooks:install
```

Guard scripts:

```bash
yarn docs:generate
yarn docs:check
yarn guard:docs
yarn guard:ipc-docs
yarn guard:contracts
yarn guard:e2e-timing
```

Generated docs:

- `docs/02_CODEBASE_MAP.md` and `docs/03_IPC_CONTRACT.md` are generated current-state docs.
- Update source files, then run `yarn docs:generate`.
- Do not hand-edit generated rows.

Bypass only when intentional (for example docs-only formatting commits):

```bash
git commit --no-verify -m "<message>"
git push --no-verify origin
```

## CI From Terminal

```bash
gh run list -R PaladinGod8/verse-vault --limit 10
gh run watch "$(gh run list -R PaladinGod8/verse-vault -s in_progress -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault --compact --exit-status

# cancel a specific run (queued or in_progress; replace <run-id>)
gh run cancel <run-id> -R PaladinGod8/verse-vault

# cancel the latest queued run
gh run cancel "$(gh run list -R PaladinGod8/verse-vault -s queued -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault

# cancel the latest in-progress run
gh run cancel "$(gh run list -R PaladinGod8/verse-vault -s in_progress -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault

# map UI run number (e.g. #37) to run ID, then cancel
$runId = gh run list -R PaladinGod8/verse-vault --json databaseId,number --limit 200 --jq ".[] | select(.number==37) | .databaseId"
gh run cancel $runId -R PaladinGod8/verse-vault

# force-cancel fallback when queued run remains queued after cancel request
gh api -X POST repos/PaladinGod8/verse-vault/actions/runs/$runId/force-cancel

# verify final state
gh run view $runId -R PaladinGod8/verse-vault --json status,conclusion,number
```

Cancel order for queue issues: cancel queued run(s) first, then restart/stop self-hosted runners only if runner maintenance is needed.

## Troubleshooting

### Native Module Rebuild Issues

```bash
yarn rebuild
```

If rebuild fails:

1. Ensure Electron is not running.
2. Re-run `yarn install`.
3. Confirm Node/Electron versions are compatible with the repository lockfile.

### Deep Clean Baseline (Slow)

Use when local caches/artifacts are likely stale or corrupted:

```powershell
Remove-Item -Recurse -Force .vite,node_modules,.cache,coverage,playwright-report,test-results,out -ErrorAction SilentlyContinue
yarn cache clean
yarn install --frozen-lockfile --force
yarn lint:full
yarn format:check
yarn test:unit:coverage
yarn package
yarn test:e2e:ci
```
