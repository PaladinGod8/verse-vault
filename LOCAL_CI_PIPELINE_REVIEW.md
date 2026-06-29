# Local CI Pipeline Review

Date: 2026-06-27

Scope reviewed:

- `package.json`
- `scripts/verify-all.cjs`
- `scripts/verify-rapid.cjs`
- `scripts/verify-smart.cjs`
- `playwright.config.ts`
- `docs/04_DEVELOPMENT.md`
- `docs/features/github-actions-setup.md`

Live check run:

- `yarn verify:rapid` passed locally on 2026-06-27.

## Bottom line

Nothing looks fundamentally broken. Current local pipeline is usable and fast lane is green.

But a few parts are structurally wrong or misleading enough that I would fix them before calling
local CI "tight":

## Inherently wrong

### 1. `verify:all` mutates working tree during a verification command

Why wrong:

- `scripts/verify-all.cjs` runs `yarn format:check`, then if it fails it runs `yarn format`, then
  re-checks formatting (`scripts/verify-all.cjs:359-373`).
- A command named `verify:*` should report drift, not silently rewrite files.
- This can hide formatting failures, leave dirty files behind, and make a "green" run depend on
  an implicit fix-up step instead of the checked-in state.

Recommendation:

- Make `verify:all` fail on `format:check`.
- If auto-fix is wanted, create explicit opt-in lane like `verify:all:fix` or tell user to run
  `yarn format` first.

### 2. `verify:all` packages app twice before E2E

Why wrong:

- `verify:all` has its own `Package app for e2e` step (`scripts/verify-all.cjs:400-401`).
- It then runs `yarn test:e2e` (`scripts/verify-all.cjs:404-413`).
- `yarn test:e2e` already does `yarn package && playwright test` (`package.json:53`).

Impact:

- Extra packaging time every strict run.
- More I/O and more chances for nondeterministic packaging drift between first and second build.
- Makes local strict lane less aligned with packaged-artifact reuse already used in CI.

Recommendation:

- After explicit packaging step, run `yarn test:e2e:ci`.
- Or remove explicit package step and let `yarn test:e2e` own packaging.
- Do not keep both.

### 3. `verify:all` always rebuilds native modules

Why wrong:

- Every strict run starts with `yarn postinstall` (`scripts/verify-all.cjs:349-350`).
- `postinstall` already maps to native rebuild (`package.json:45-46`).
- Rebuilding native modules on every validation run is not a verification concern; it is setup /
  dependency hygiene concern.

Impact:

- Slower strict lane.
- More false failures from file locks or local Electron processes.
- More local-machine variance unrelated to code correctness.

Recommendation:

- Rebuild only on `--install`, explicit `--rebuild-native`, or when Node / Electron / lockfile
  fingerprint changes.
- `verify:rapid` already has better model here with opt-in rebuild flag
  (`scripts/verify-rapid.cjs:4-5`, `scripts/verify-rapid.cjs:169-174`).

## High-value improvements

### 4. `verify:all:dev` hardcodes `PLAYWRIGHT_WORKERS=8`

Evidence:

- `verify:all` injects `PLAYWRIGHT_WORKERS=8` when dev mode is enabled
  (`scripts/verify-all.cjs:407-412`).
- Playwright config defaults to 2 workers and docs frame higher counts as local override tuning,
  not strict-default behavior (`playwright.config.ts:3-9`, `playwright.config.ts:25`,
  `docs/features/optimization.md`, "Use higher values only for local development. Keep CI on the
  default capped value for stability.").

Why improve:

- Eight Electron workers is aggressive for a "strict" validation lane.
- Good for perf experiments, bad as default if goal is low-flake signal.

Recommendation:

- Keep strict lane on config default.
- Let users opt into higher worker counts manually via env var.
- If needed, add explicit perf lane like `verify:all:dev:8`.

### 5. `verify:all` skips `guard:e2e-timing`

Evidence:

- `verify:rapid` includes `guard:e2e-timing` (`scripts/verify-rapid.cjs:24-33`).
- `verify:all` includes docs, contracts, lint, unit, package, e2e, but not `guard:e2e-timing`
  (`scripts/verify-all.cjs:349-422`).

Why improve:

- Timing anti-patterns in E2E are cheap to catch before package + Playwright boot.
- Strict lane should include at least everything rapid lane treats as essential static safety.

Recommendation:

- Add `yarn guard:e2e-timing` before package / e2e in `verify:all`.

### 6. `verify:smart` does not run docs or contract guards

Evidence:

- `verify:smart` runs format, typecheck, secret scan, lint, unit, and E2E selection
  (`scripts/verify-smart.cjs:525-705`).
- It never runs `docs:check`, `guard:contracts`, or `guard:e2e-timing`.

Why improve:

- This lane is marketed as a changeset-aware local CI command.
- For IPC / preload / shared-contract edits, skipping docs and contract guards creates blind spots.

Recommendation:

- Add conservative triggers:
  - run `docs:check` when generated-doc source files change
  - run `guard:contracts` when `src/shared/`, `src/preload.ts`, `src/main/`, renderer `window.db`
    callsites, or `forge.env.d.ts` change
  - run `guard:e2e-timing` when `tests/e2e/**` changes

### 7. Local pipeline docs have drift from actual scripts

Evidence:

- `docs/features/github-actions-setup.md` says rapid mode runs only five commands
  (`docs/features/github-actions-setup.md:181-187`).
- Actual `verify:rapid` runs nine tasks including `docs:check`, `guard:contracts`,
  `guard:e2e-timing`, and full docs lint (`scripts/verify-rapid.cjs:24-33`).
- Same doc says `YARN_ENABLE_GLOBAL_CACHE: 'true'` (`docs/features/github-actions-setup.md:40-42`)
  while workflow sets `'false'` (`.github/workflows/ci.yml:18`).
- Same doc says `actions/setup-node` provides yarn cache (`docs/features/github-actions-setup.md:48-49`)
  but workflow uses separate cache steps instead (`.github/workflows/ci.yml:53-72`).

Why improve:

- Pipeline docs should be trusted operationally.
- Drift here makes future CI changes riskier because humans read wrong behavior model.

Recommendation:

- Treat pipeline docs as generated-from-script metadata or at least update them in same commit as
  pipeline edits.

## Suggested priority order

1. Stop `verify:all` from auto-formatting.
2. Remove double packaging in strict lane.
3. Stop unconditional native rebuild in strict lane.
4. Add `guard:e2e-timing` to strict lane.
5. Teach `verify:smart` about docs / contract guards.
6. Reconcile pipeline docs with actual scripts.

## If you want minimal next patch set

Smallest high-signal patch:

- change `verify:all` to fail on format drift
- swap strict E2E step from `yarn test:e2e` to `yarn test:e2e:ci`
- move native rebuild behind explicit flag
- add `yarn guard:e2e-timing` before E2E

That would remove most avoidable waste and most misleading behavior without redesigning whole
workflow surface.
