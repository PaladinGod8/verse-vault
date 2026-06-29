# Test Coverage Implementation Plan

Purpose: give next coding agent concrete plan to improve critical-path coverage, E2E confidence, and coverage tooling in this repo.

## Scope

Focus areas:

- critical UX flows
- cross-layer main/preload/renderer/DB confidence
- E2E proof quality
- stronger branch-coverage enforcement

Out of scope for first pass:

- broad refactors unrelated to testability
- new product features
- non-critical doc cleanup
- merged Playwright + Vitest coverage tooling

## Verified Baseline

Verified on current checkout:

- `yarn test:unit:run` passed
- `yarn test:e2e` passed
- `yarn guard:contracts` passed
- `yarn guard:e2e-timing` passed

Counts and coverage:

- unit test files: `131`
- unit tests: `1427`
- E2E spec files: `15`
- E2E tests: `69`
- dedicated `tests/integration/`: none
- unit coverage lines: `89.82%`
- unit coverage branches: `82.14%`
- unit coverage functions: `88.35%`
- unit coverage statements: `89.41%`

Current threshold state:

- Vitest already enforces `80%` for lines, statements, functions, and branches
- current branch coverage is above floor, but only narrowly
- next pass should make branch coverage a first-class target, not only a passive threshold

Important interpretation:

- repo has strong unit and seam coverage
- repo has real Playwright coverage for some high-value flows
- repo does not yet prove all critical user journeys end to end

## Current E2E Coverage

Existing real E2E surface covers these areas:

- app launch and landing shell
- abilities CRUD and child-link flow
- battlemaps CRUD
- battlemap runtime core play flow
- casting range overlay in runtime
- statblocks CRUD
- statblock statistics flow
- characters create + search by player-character/owner
- token CRUD
- token move flows
- token runtime palette behavior
- world default statistics behavior
- world statistics config CRUD
- campaign/arc/act/session backbone flow

## Current Gaps

Critical user journeys with no direct E2E proof yet:

- settings page persistence and restart behavior
- levels page CRUD
- faction list page CRUD and filtering
- faction detail page editing and membership flow
- character detail page editing and membership flow
- campaign scenes page flow
- session scenes page flow

Critical user journeys only partially covered:

- world lifecycle: create covered, edit/delete/image persistence not covered end to end
- campaigns: create/navigation covered, edit/delete not covered end to end
- sessions: create covered, edit/delete/reorder/move not fully covered end to end
- characters: create/search covered, detail/edit/image/faction links not covered end to end

Proof-quality gaps in existing E2E:

- several suites share one app/page across many tests via `beforeAll`/`afterAll`
- several suites seed state through `window.db` or `self.db` instead of UI
- this proves downstream behavior but bypasses some UX steps
- launch helper currently prefers repo `.vite/build/main.js` before packaged `app.asar`
- that weakens "packaged app" confidence when `yarn test:e2e` is used

Backend coverage gap:

- `src/database/repos/tokensRepo.ts` is live production code and shows `0%` unit coverage

Signal-quality gap:

- unit suite passes with React `act(...)` warnings around `CharacterCombobox`-related tests

## Route Coverage Matrix

Routes with direct E2E proof:

- `/`
- `/world/:id/abilities`
- `/world/:id/campaigns`
- `/world/:id/battlemaps`
- `/world/:id/tokens`
- `/world/:id/statblocks`
- `/world/:id/characters`
- `/world/:id/statistics`
- `/world/:id/battlemaps/:battleMapId/runtime`
- `/world/:id/campaign/:campaignId/arcs`
- `/world/:id/campaign/:campaignId/arc/:arcId/acts`
- `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`

Routes lacking direct E2E proof:

- `/settings`
- `/world/:id/levels`
- `/world/:id/characters/:characterId`
- `/world/:id/factions`
- `/world/:id/factions/:factionId`
- `/world/:id/campaign/:campaignId/scenes`
- `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes`

## Recommended Work Order

Implement in this order.

### 1. Tighten E2E Proof Quality

Goals:

- prefer packaged app launch target for E2E
- reduce shared state between tests
- classify critical-path tests explicitly

Changes:

- update `tests/e2e/helpers/launchApp.ts` to prefer packaged `out/.../app.asar` when present
- review suites using `beforeAll`/shared app state and convert high-value ones to per-test app launch where practical
- keep `runtime` project serial if needed, but individual tests should still be isolated
- add Playwright tags in test titles or `test.describe` blocks for:
  - `@critical`
  - `@ux`
  - `@db`
  - `@runtime`

Acceptance:

- `yarn test:e2e` still green
- `npx playwright test --grep @critical` runs critical lane only
- launch helper behavior documented in code comments

### 2. Fill Highest-Value Missing E2E Flows

Do these first:

1. settings
2. factions
3. scenes
4. character detail
5. levels
6. world lifecycle
7. sessions management

Suggested new specs:

- `tests/e2e/settings.test.ts`
- `tests/e2e/factions.test.ts`
- `tests/e2e/scenes.test.ts`
- `tests/e2e/character-detail.test.ts`
- `tests/e2e/levels.test.ts`
- `tests/e2e/worlds.test.ts`
- `tests/e2e/sessions.test.ts`

Suggested minimum scenarios:

`settings.test.ts`

- change theme
- restart app
- assert persisted theme after relaunch
- assert custom palette persistence if custom theme exists

`factions.test.ts`

- create faction
- edit faction
- delete faction
- manage faction types
- add/remove members
- open faction detail page and save edits

`scenes.test.ts`

- open campaign scenes page
- create scene
- edit scene
- delete scene
- open session scenes page
- move scene between sessions if supported

`character-detail.test.ts`

- create character
- open detail page
- edit profile/wiki data
- change primary faction membership
- assert persisted values after reload

`levels.test.ts`

- create level
- edit level
- delete level
- verify expected list state/order

`worlds.test.ts`

- create world through UI
- edit world
- upload/replace/clear world image if supported
- delete world

`sessions.test.ts`

- create session
- edit session
- delete session
- reorder session
- move session if supported

### 3. Cover Live Backend Gap

Add focused repo tests for `src/database/repos/tokensRepo.ts`.

Suggested file:

- `tests/unit/database/tokensRepo.test.ts`

Scenarios:

- `moveToWorld` success
- `moveToWorld` invalid token id
- `moveToCampaign` success
- `moveToCampaign` invalid token id
- `moveToCampaign` invalid campaign id
- `moveToCampaign` cross-world rejection
- positive-integer validation on public methods

Acceptance:

- `src/database/repos/tokensRepo.ts` no longer at `0%` coverage

### 4. Clean Unit Test Warnings

Fix React test warnings around `act(...)`.

Targets:

- `tests/unit/renderer/characterCombobox.test.tsx`
- any `FactionMembersEditor` tests triggering nested `CharacterCombobox` async updates

Acceptance:

- `yarn test:unit:run` green
- no `act(...)` warnings in output for touched tests

### 5. Add Critical-Path Coverage Reporting

This repo already has unit coverage. Add business-flow visibility on top.

Implement both:

- route/critical-path matrix doc or generated report
- tagged Playwright critical lane

Suggested artifact:

- `docs/testing/CRITICAL_PATH_MATRIX.md` if repo already allows it
- if not, use one existing testing doc and add small section instead

Matrix should track:

- route
- user journey
- unit proof
- E2E proof
- criticality
- status: covered / partial / missing

### 6. Enforce Minimum Branch Coverage

Option A still applies here. No new coverage library needed.

Intent:

- keep current Vitest coverage flow
- make branch coverage more visible
- raise branch expectations in controlled steps

Important baseline:

- current branch coverage: `82.14%`
- current Vitest branch threshold: `80%`

Recommended rollout:

Phase 1:

- keep global branches threshold at `80%`
- add explicit reporting in CI/local output so branch coverage is called out separately
- add one small script that reads `coverage/coverage-summary.json` and fails if branches drop below configured floor
- use this script even if Vitest already has thresholds, because it makes branch coverage explicit and easy to tighten later

Phase 2:

- after `tokensRepo` and highest-risk route gaps are covered, raise branch threshold to `83%`

Phase 3:

- after missing critical E2E routes and weak branch hotspots are improved, raise branch threshold to `85%`

Why staged instead of immediate `85%`:

- repo currently sits at `82.14%`
- jumping straight to `85%` would fail current mainline before test gap work lands
- staged tightening gives agent clear order: improve tests first, then ratchet threshold

Suggested implementation:

- keep `vitest.config.ts` coverage thresholds for lines/statements/functions at current values unless team wants broader tightening
- update `vitest.config.ts` branch threshold when each phase is reached
- add script such as `scripts/check-branch-coverage.cjs`
- add script entry such as `"coverage:branches": "node scripts/check-branch-coverage.cjs"`

Suggested script behavior:

- read `coverage/coverage-summary.json`
- print total branch coverage
- fail if total branch coverage is below env-configured threshold or hardcoded repo threshold
- optionally print lowest-covered production files to guide debugging

Suggested env/config pattern:

- default floor: `80`
- next floor after Phase 2: `83`
- next floor after Phase 3: `85`

Acceptance for Phase 1:

- branch coverage called out explicitly in local and CI workflows
- branch floor checked by dedicated script
- current repo still passes

Acceptance for Phase 2:

- branch threshold in `vitest.config.ts` raised to `83`
- repo passes at new floor

Acceptance for Phase 3:

- branch threshold in `vitest.config.ts` raised to `85`
- repo passes at new floor

## Tooling Install Recommendation

Selected option: Option A.

### Option A: Keep Current Coverage Tooling, Add Tags Only

No new package required.

Use:

- Vitest native V8 coverage already configured
- Playwright tags plus filtered runs for `@critical`

Suggested scripts:

- `"test:e2e:critical": "yarn package && playwright test --grep @critical"`
- `"test:e2e:critical:ci": "playwright test --grep @critical"`
- `"coverage:branches": "node scripts/check-branch-coverage.cjs"`

This is chosen path for this repo.

## Suggested Implementation Slices

Use small commits.

Slice 1:

- packaged-first launch helper
- add `@critical` tagging
- add critical E2E scripts
- add dedicated branch coverage check script

Suggested commit:

- `test: tighten e2e lane and add branch coverage check`

Slice 2:

- add settings + worlds E2E

Suggested commit:

- `test: add settings and world lifecycle e2e coverage`

Slice 3:

- add factions + character detail E2E

Suggested commit:

- `test: add factions and character detail e2e coverage`

Slice 4:

- add levels + scenes + sessions E2E

Suggested commit:

- `test: add missing campaign and route e2e coverage`

Slice 5:

- add `tokensRepo` unit tests
- remove `act(...)` warnings in touched tests

Suggested commit:

- `test: cover tokens repo and clean async test warnings`

Slice 6:

- raise branch threshold after gap work lands

Suggested commit:

- `test: raise minimum branch coverage threshold`

## Agent Instructions

Give next agent these constraints:

- follow `AGENTS.md`
- prefer TDD slices
- keep production changes minimal unless tests expose real bugs
- if IPC/shared contracts move, run `yarn docs:generate`
- keep E2E isolated
- avoid `waitForTimeout`
- prefer real UI setup for critical-path specs
- only use `window.db` seeding when setup cost is too high and note it in test comments
- treat branch coverage as separate pass/fail signal, not hidden inside generic coverage

## Validation Checklist

For each slice:

- `yarn lint`
- `yarn test:unit:quick`
- `yarn coverage:branches` after coverage-producing unit runs exist for the slice
- targeted Playwright spec or project
- `yarn guard:contracts` when cross-layer code changes
- `yarn guard:e2e-timing`

Before calling branch ready:

- `yarn test:unit:run`
- `yarn coverage:branches`
- `yarn test:e2e`
- `yarn guard:contracts`
- `yarn guard:e2e-timing`
- `yarn docs:check` if docs/generated docs changed

## Definition Of Done

Minimum done state:

- missing critical routes have direct E2E proof
- high-value suites are tagged `@critical`
- critical lane runnable via script
- `tokensRepo.ts` covered by unit tests
- touched tests no longer emit `act(...)` warnings
- E2E launch helper prefers packaged artifact when available
- explicit branch-coverage check script exists
- branch coverage floor is documented and enforced

Stretch done state:

- branch threshold raised from `80%` to `83%`
- critical-path matrix doc is present and maintained
