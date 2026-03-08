# Development Guide

This guide covers local setup, daily development commands, validation gates,
and common troubleshooting steps.

## Environment Requirements

- Node.js 22 LTS (recommended)
- Yarn 1.22.x (`yarn --version`)
- Git
- Optional for docs linting: Vale CLI available on `PATH`

## First-Time Setup

1. Clone the repository.
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
yarn verify:all
yarn verify:all:dev
```

Fresh install variants:

```bash
yarn verify:all:fresh
yarn verify:all:dev:fresh
```

Recommended cadence:

1. `yarn verify:rapid` while iterating.
2. `yarn verify:all` before push/PR.

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
yarn guard:docs
yarn guard:ipc-docs
```

Bypass only when intentional (for example docs-only formatting commits):

```bash
git commit --no-verify -m "<message>"
git push --no-verify origin
```

## CI From Terminal

```bash
gh run list -R PaladinGod8/verse-vault --limit 10
gh run watch "$(gh run list -R PaladinGod8/verse-vault -s in_progress -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault --compact --exit-status
```

## Troubleshooting

### Native Module Rebuild Issues

```bash
yarn rebuild
```

If rebuild fails:

1. Ensure Electron is not running.
2. Re-run `yarn install`.
3. Confirm Node/Electron versions are compatible with repository lockfile.

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
