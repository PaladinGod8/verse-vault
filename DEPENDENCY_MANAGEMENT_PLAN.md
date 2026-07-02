# Dependency Management Plan

## Goal

Manage dependencies across three separate concerns:

1. Detect outdated packages.
2. Fail local CI on meaningful vulnerabilities.
3. Optionally automate update proposal flow.

Do not force one tool to solve all three jobs.

## Repo Reality

- Package manager: Yarn 1 (`yarn.lock` present, no `package-lock.json`)
- App type: Electron + React + TypeScript desktop app
- Native/runtime risk: `better-sqlite3`, Electron ABI, Electron Forge version matching
- Local truth lane: `yarn verify:all`
- Existing security lane: `yarn security:secrets`

Because this repo has native Electron dependencies, dependency updates are higher-risk than plain web-app updates. That makes automated scanning useful, but broad blind auto-updates should stay separate from the blocking local CI gate.

## Recommendation

Use different tools for different jobs.

### 1. Outdated Packages

Use built-in Yarn reporting for quick visibility:

```bash
yarn outdated
```

Recommended script:

```json
"deps:outdated": "yarn outdated"
```

This should be informational, not blocking, because "outdated" does not mean "unsafe" or "wrong".

### 2. Vulnerability Gate In `verify:all`

Use Trivy as the blocking dependency vulnerability check.

Recommended script:

```json
"security:deps": "trivy fs --scanners vuln --include-dev-deps --severity HIGH,CRITICAL --exit-code 1 ."
```

Why Trivy fits this repo:

- Works against `yarn.lock`
- Can include `devDependencies`
- Can fail only on `HIGH` and `CRITICAL`
- Works as local CLI, so it fits `verify:all`
- Stays separate from existing secret scanning

Important: pass `--scanners vuln` so this lane does not duplicate secret scanning already handled by `security:secrets`.

Suggested `verify:all` order:

1. `security:secrets`
2. `security:deps`
3. format / typecheck / docs / contracts / tests / package / E2E

### 3. Planned Update Work

Use `npm-check-updates` as planning aid, not as blocking CI gate.

Recommended command:

```bash
npx npm-check-updates
```

Optional script:

```json
"deps:update:check": "npx npm-check-updates"
```

This is useful when intentionally preparing dependency-update work, because it shows available version bumps without changing the repo's CI behavior.

### 4. Automated Update PRs

Use Dependabot or Renovate only if automated update branches/PRs are wanted.

This is separate from local `verify:all`.

- Dependabot/Renovate: create update proposals
- Trivy: fails local CI on vulnerable dependencies
- `yarn outdated` / `npm-check-updates`: operator visibility and planning

## What Not To Use As Main Gate

### `npm ci`

Do not use `npm ci` here. This repo is Yarn 1, so frozen installs should stay:

```bash
yarn install --frozen-lockfile
```

### `act`

Do not treat `act` as primary local CI runner for this repo.

Reason:

- CI is Windows self-hosted
- Repo packages Electron app
- Repo rebuilds native modules
- Playwright and packaged-app flow are already encoded in `yarn verify:all`

For this checkout, `yarn verify:all` is better local truth than trying to mirror the GitHub Actions workflow through generic Docker emulation.

### `audit-ci`

Not recommended as primary solution here.

Reason:

- Built around audit endpoints rather than a broader local filesystem scanner
- Less attractive on Yarn 1
- More brittle than Trivy for this repo's current stack and goals

## Proposed Package Scripts

```json
{
  "scripts": {
    "deps:outdated": "yarn outdated",
    "deps:update:check": "npx npm-check-updates",
    "security:deps": "trivy fs --scanners vuln --include-dev-deps --severity HIGH,CRITICAL --exit-code 1 ."
  }
}
```

## Proposed Working Model

Day-to-day:

```bash
yarn deps:outdated
```

Planned update review:

```bash
yarn deps:update:check
```

Blocking local gate:

```bash
yarn verify:all
```

After `security:deps` is wired in, `verify:all` should fail when dependency vulnerabilities at `HIGH` or `CRITICAL` are detected.

## Final Recommendation

Best overall setup for this repo:

- `yarn outdated` for outdated visibility
- `npm-check-updates` for update planning
- `Trivy` for blocking vulnerability checks in `verify:all`
- optional Dependabot or Renovate for automated update PRs

Best single addition to local `verify:all`:

- `Trivy`
