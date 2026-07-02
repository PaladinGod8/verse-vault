# Agentic Final Testing Quality Gate

Use this as a copy-paste prompt when a feature branch is complete and needs a final quality pass by a coding agent (Claude Code, GitHub Copilot, ChatGPT Codex, etc.).

## Copy-Paste Prompt

```md
Run a final testing and quality-gate pass on the currently pushed feature changes.

Context and constraints:

- Follow repository rules in `AGENTS.md` and docs guardrails.
- Treat `docs/02_CODEBASE_MAP.md` and `docs/03_IPC_CONTRACT.md` as generated current-state docs; regenerate them from source changes instead of hand-editing generated rows.
- Keep Electron security boundary intact (`contextIsolation: true`, `nodeIntegration: false`, no Node APIs in renderer).
- Use IPC constants from `src/shared/ipcChannels.ts`; no magic channel strings.
- Prefer fixing production code first when tests reveal behavior bugs.
- Only fix test code when the failing test itself is outdated/incorrect.
- Keep each fix small, safe, and reversible.

Required gate order (strict):

1. Lint/format gate
2. Unit test gate
3. Coverage gate (>= 80%)
4. E2E gate

Do not move to the next gate unless the current gate is green.
If you touch code at any gate, re-run all earlier gates before proceeding.

Detailed instructions:

## Gate 1: Lint and Format

- Run lint and format checks (repo standard commands).
- Fix all lint/format issues.
- Re-run until clean.

## Gate 2: Unit Tests

- Run unit tests.
- For failures:
  - Diagnose root cause.
  - If behavior is broken, fix production code first.
  - If test is wrong/stale, then fix test code.
- Re-run lint gate after code edits.
- Re-run unit tests until all pass.

Async and isolation checklist (fix before moving to Gate 3):

- Every async mock call and user interaction is `await`ed.
- Elements that appear after async operations use `findBy*` queries, not `getBy*`.
- `vi.clearAllMocks()` appears in `beforeEach`; use shared helpers where they reduce duplication:
  - use `setupWindowDb()` / `resetWindowDb()` from `tests/helpers/ipcMock.ts` for substantial `window.db` setup/reset
  - use entity builders from `tests/helpers/factories.ts` for repeated/full-shape row fixtures
  - use `resetFactoryIds()` in `beforeEach` when deterministic ID ordering is required
  - keep concise one-off inline literals/mocks when they are clearer
- `userEvent.setup()` is called per-test or in `beforeEach`, never shared across tests.
- No `setTimeout`, `sleep`, or fixed delays — only async queries and mock resolution.
- Wrap async state updates that happen outside React's event system in `act(async () => { ... })`.
- Flag any test that hangs or has a flaky timing window and treat it as a bug.

## Gate 3: Coverage (Minimum 80%)

- Run coverage using the repository's unit test coverage command/mode.
- Enforce overall repository coverage >= 80%.
- Add focused tests where coverage is low, prioritizing:
  - newly added or changed feature code
  - critical behavior paths and edge cases
- Prefer unit tests unless a behavior is only validatable via e2e.
- After adding tests, re-run lint + unit + coverage until all pass and coverage is >= 80%.

## Gate 4: E2E Tests

- Run e2e tests in a reliable sequence.
- Segment/serialize tests that share resources/state to avoid cross-test interference.
- For failures:
  - Fix production code first if behavior is actually broken.
  - Fix e2e test code only when test assumptions/selectors/flow are outdated.
- Re-run gates 1-3 when code/test edits are made, then re-run e2e.
- Repeat until all e2e tests pass.

Async and isolation checklist (required for every E2E test):

- Every test calls `launchApp()` independently — never reuse an app instance across tests.
- Every test wraps its body in `try/finally` and calls `closeApp(app, userDataDir)` in the `finally` block.
- All waits use `waitForFunction`, `waitForSelector`, or `expect(locator).toBeVisible()` — never `page.waitForTimeout`.
- After `launchApp()`, the test waits for a known stable UI element before asserting anything.
- `smoke` and `medium` projects run with `fullyParallel: true` (default cap: 2 workers, local override via `PLAYWRIGHT_WORKERS`) — each test must be fully isolated with its own temp database directory.
- `runtime` project runs with `fullyParallel: false` — tests still must be stateless and order-independent.
- No shared file-system paths, database files, or process-level state between tests or workers.
- Any test that hangs, leaks an Electron process, or leaves a temp directory is treated as a bug and fixed before this gate can pass.

Execution behavior:

- Be explicit about each command you run.
- Stop hiding failures: surface failing files/tests and root cause.
- Make minimal diffs and keep architecture boundaries intact.
- Update hook-required living docs in the same commit step when touched files require it.
- Re-run `yarn docs:check` and `yarn guard:contracts` after changes that affect shared contracts or generated docs.

Output format (required):

1. Gate status summary:
   - Gate 1 Lint/Format: PASS/FAIL
   - Gate 2 Unit: PASS/FAIL
   - Gate 3 Coverage: PASS/FAIL with percentage
   - Gate 4 E2E: PASS/FAIL
2. Files changed (production vs tests vs docs).
3. Why each change was needed (root-cause based).
4. Coverage additions:
   - New/updated test files
   - Behaviors covered
   - Remaining coverage gaps (if any)
5. Final quality result:
   - all gates green or exact blocker.
6. Suggested final commit message for this gate step using one prefix: `fix:`, `test:`, `chore:`, or `docs:`.
```

## Use During Prompt-Splitting Workflows

When creating sequential prompts under `docs/prompts/`, include a late-stage step named `Final Quality Gate` that references this file.

Recommended wording inside that step:

```md
Run the final gate in `docs/06_AGENTIC_TESTING_QUALITY_GATE.md` and do not mark this step done until all four gates are green in order.
```

## Notes

- This file defines the cross-agent quality gate behavior.
- Feature-level documentation still belongs in `docs/features/<feature-slug>.md` as the final docs step.

## Critical Path Matrix

Use these focused commands before full-lane escalation:

- `yarn test:e2e:critical`
- `yarn test:e2e:critical:ci`
- `yarn coverage:branches`

Current route and journey status:

| Route                                                                             | Journey                                                     | Unit proof | E2E proof        | Criticality | Status  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- | ---------------- | ----------- | ------- |
| `/`                                                                               | Launch worlds shell plus world CRUD and thumbnail lifecycle | Yes        | Yes              | High        | Covered |
| `/settings`                                                                       | Theme persistence across restart                            | Yes        | Yes              | High        | Covered |
| `/world/:id/levels`                                                               | Level CRUD                                                  | Yes        | Yes              | High        | Covered |
| `/world/:id/characters`                                                           | Character create and search                                 | Yes        | Yes              | High        | Covered |
| `/world/:id/characters/:characterId`                                              | Detail edit, image, primary faction                         | Yes        | Yes              | High        | Covered |
| `/world/:id/backgrounds`                                                          | Background create, search, sort, and pagination             | Yes        | Yes              | High        | Covered |
| `/world/:id/backgrounds/:backgroundId`                                            | Detail render, mark-viewed, and edit                        | Yes        | Yes              | High        | Covered |
| `/world/:id/factions`                                                             | Type management, filter, CRUD                               | Yes        | Yes              | High        | Covered |
| `/world/:id/factions/:factionId`                                                  | Detail edit and membership                                  | Yes        | Yes              | High        | Covered |
| `/world/:id/campaign/:campaignId/scenes`                                          | Campaign-wide scene listing and drill-in                    | Yes        | Yes              | High        | Covered |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`                  | Session create, edit, move, delete                          | Yes        | Yes              | High        | Covered |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes` | Scene create, edit, move, delete                            | Yes        | Yes              | High        | Covered |
| `/world/:id/campaigns`                                                            | Campaign create and navigation                              | Yes        | Yes              | High        | Covered |
| `/world/:id/battlemaps/:battleMapId/runtime`                                      | Runtime play flow                                           | Yes        | Yes              | High        | Covered |
| Session reorder via DnD                                                           | Drag reorder persistence                                    | Yes        | No dedicated E2E | Medium      | Partial |

Branch coverage policy:

- Dedicated branch floor command: `yarn coverage:branches`
- Current enforced branch floor: `83%`
- Raise only after fresh full-suite coverage proves new floor is green end to end.
