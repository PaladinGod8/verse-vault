# Dependency Management

## Purpose

Keep local verification gates from shipping known-vulnerable dependencies, and
give the operator standing visibility into outdated and replaceable packages.

Three concerns are handled by three tools, so no single tool is forced to do
every job:

- Detect vulnerabilities (blocking).
- Detect outdated packages (informational).
- Plan intentional update work (on demand).

## Behavior

- `yarn security:deps` runs Trivy against the repo `yarn.lock`, failing on
  `HIGH` and `CRITICAL` dependency vulnerabilities (`--scanners vuln` only, so it
  never duplicates the `gitleaks` secret lane).
- `yarn verify:all` runs the Trivy gate right after the secret scan and before
  format, lint, unit, package, and E2E steps.
- `yarn verify:all` also prints `yarn outdated` as a non-blocking, informational
  step so behind-latest packages surface on every full run without failing the
  gate.
- `yarn deps:outdated` reports behind-latest packages on demand.
- `yarn deps:update:check` runs `npm-check-updates` to plan intentional version
  bumps without changing repo state.
- `.trivyignore` records confirmed false positives or explicitly accepted risks;
  it is kept empty unless a suppression is justified.

Because this is an Electron app with native modules (`better-sqlite3`, Electron
ABI, Electron Forge version matching), dependency upgrades are higher-risk than
plain web-app bumps. Blocking is limited to real vulnerabilities; broad automated
upgrades stay out of the blocking gate.

## Seams Touched

- `scripts/deps-scan.cjs`
- `scripts/verify-all.cjs`
- `.trivyignore`
- `package.json` (`security:deps`, `deps:outdated`, `deps:update:check`)

## Tests

- `tests/unit/scripts/deps-scan.test.ts`
- `tests/unit/scripts/verify-all.test.ts`

## Follow-Ups

- CI runs `yarn security:deps` as the `deps` lane of the `fast-checks` matrix
  (`.github/workflows/ci.yml`); Trivy must be preinstalled on self-hosted
  runners (see `docs/features/github-actions-setup.md`).
- Consider Dependabot or Renovate only if automated update PRs are wanted; that
  flow stays separate from the blocking local gate.
