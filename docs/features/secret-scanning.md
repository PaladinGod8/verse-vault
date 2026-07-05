# Secret Scanning

## Purpose

Keep local verification gates from shipping leaked credentials or tokens.

## Behavior

- `yarn security:secrets` runs `gitleaks` against current working tree and full git history.
- `yarn verify:rapid` and `yarn verify:smart` run working-tree-only secret scans for faster local feedback.
- `yarn verify:all` runs the full secret gate before format, lint, unit, package, and E2E steps.
- `.gitleaks.toml` ignores generated local artifacts such as `out/`, `.vite/`, coverage output, and pipeline logs to cut false positives.
- CI runs `yarn security:secrets` as the `secrets` lane of the `fast-checks` matrix (`.github/workflows/ci.yml`); `gitleaks` must be preinstalled on self-hosted runners.

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

- `gitleaks` must be installed on self-hosted CI runners for the `secrets` fast-check lane to run (see `docs/features/github-actions-setup.md`).
