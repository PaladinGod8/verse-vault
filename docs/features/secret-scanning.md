# Secret Scanning

## Purpose

Keep local verification gates from shipping leaked credentials or tokens.

## Behavior

- `yarn security:secrets` runs `gitleaks` against current working tree and full git history.
- `yarn verify:rapid` and `yarn verify:smart` run working-tree-only secret scans for faster local feedback.
- `yarn verify:all` runs the full secret gate before format, lint, unit, package, and E2E steps.
- `.gitleaks.toml` ignores generated local artifacts such as `out/`, `.vite/`, coverage output, and pipeline logs to cut false positives.

## Seams Touched

- `scripts/secret-scan.cjs`
- `scripts/verify-all.cjs`
- `scripts/verify-rapid.cjs`
- `scripts/verify-smart.cjs`
- `.gitleaks.toml`

## Tests

- `tests/unit/scripts/secret-scan.test.ts`
- `tests/unit/scripts/verify-all.test.ts`

## Follow-Ups

- Install `gitleaks` on self-hosted CI runners if those lanes should match local verification exactly.
