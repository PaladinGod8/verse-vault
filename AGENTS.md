# Verse Vault Agent Guide

This file is the shared instruction contract for coding agents working in this repository (Codex, GitHub Copilot, Claude, and similar tools).

## Priority

1. Explicit user request in the current chat/session
2. This `AGENTS.md`
3. File-level or tool-level instructions (for example `.claude/CLAUDE.md`)
4. Existing project docs and code conventions

If instructions conflict, follow the highest-priority item and call out the conflict in your response.

## Project Baseline

- Stack: Electron 35, React 19, Vite 6, TypeScript, better-sqlite3, Tailwind v4, Zustand 5, React Router 7
- Architecture: Main <-> Preload <-> Renderer
- Security boundary:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - no Node.js APIs in renderer
- IPC rules:
  - use `window.db` in renderer
  - never call `ipcRenderer` directly in renderer code
  - all channel names must come from `src/shared/ipcChannels.ts`
- Database:
  - `better-sqlite3` only in main process
  - schema updates in `src/database/db.ts`

Use these docs for orientation before major changes:

- `docs/00_INDEX.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_CODEBASE_MAP.md`
- `docs/03_IPC_CONTRACT.md`
- `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`
- `docs/features/`
- `docs/CHECKLIST.md`

## Standard Development Loop (Agent + Human)

The repository uses a strict 3-phase workflow. Do not merge phases unless the user explicitly asks.

1. Phase 1 - Code
2. Phase 2 - Tests
3. Phase 3 - Docs

Exception:

- githook-required living docs updates are part of the same small commit for Phase 1/2 when those files are touched.

Default ownership:

- Agent implements requested phase
- Human runs full local validation and product verification manually

### Phase 1 - Code

- Implement only the requested feature/refactor.
- Do not modify tests in this phase.
- Keep githook-required living docs updated in the same small commit when touched files require it.
- Keep changes scoped and architecture-compliant.
- If IPC changes are needed, update in this order:
  1. `src/shared/ipcChannels.ts`
  2. `src/main.ts` handlers
  3. `src/preload.ts` bridge
  4. `forge.env.d.ts` shared types

### Phase 2 - Tests

- Add or update tests for changed behavior.
- Unit tests: `tests/unit/`
- E2E tests: `tests/e2e/`
- Prefer minimal, behavior-focused tests.
- Follow existing patterns in:
  - `tests/unit/App.test.tsx`
  - `tests/e2e/app.test.ts`
- For final pre-merge validation, run the strict ordered quality gate in `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`.

#### Async and Race-Condition Rules

Unit tests (Vitest + React Testing Library):

- Always `await` every async mock call and every async user interaction.
- Use `findBy*` queries (not `getBy*`) when an element appears after an async operation — `findBy*` retries automatically and will not cause a hanging test.
- Use shared test helpers where they improve clarity and reduce duplication:
  - use entity factories from `tests/helpers/factories.ts` (for example `buildWorld`, `buildToken`) for repeated/full-shape entity fixtures
  - call `resetFactoryIds()` in `beforeEach` when deterministic IDs matter
  - use `setupWindowDb()` from `tests/helpers/ipcMock.ts` when a test needs substantial `window.db` mocking
  - call `resetWindowDb()` in `beforeEach` when using the harness to clear mock state between tests
  - small one-off inline literals/mocks are acceptable when they are clearer than factory or harness setup
- Instantiate `userEvent.setup()` inside each test or in `beforeEach` — never share a user-event instance across tests.
- Wrap async state updates that happen outside React's event system in `act(async () => { ... })`.
- Never use `setTimeout`, `sleep`, or raw delays — replace with proper async queries or mock resolution.

E2E tests (Playwright + Electron):

- Call `launchApp()` per test, not per file — each test must own its isolated temporary SQLite database directory.
- Always call `closeApp(app, userDataDir)` in a `finally` block so the app and temp dir are cleaned up even on failure.
- Use `waitForFunction`, `waitForSelector`, or `expect(locator).toBeVisible()` for deterministic waits; never use `page.waitForTimeout`.
- After `launchApp()`, wait for a known stable UI state (a heading, landmark, or specific element) before making any assertion.
- Never share file-system paths, database files, or in-process state between parallel workers.

### Prompt-Splitting Requirement

When an agent creates sequential implementation prompts under `docs/prompts/`, include a final step named `Final Quality Gate` that references `docs/06_AGENTIC_TESTING_QUALITY_GATE.md` and requires all gates to pass in order.

### Phase 3 - Docs

For normal feature updates, use this phase for feature-specific documentation:

- create or update `docs/features/<feature-slug>.md`
- do not do broad final reconciliation of living docs in this phase; those updates should already be done in earlier small commits

Add an ADR in `docs/adr/` only for real architecture decisions:

- storage model change
- IPC pattern change
- security boundary change
- significant technology decision

## Commands

Primary local checks:

- `yarn lint`
- `yarn format:check`
- `yarn test:unit:run`
- `yarn package`
- `yarn test:e2e`

Full pipeline:

- `yarn verify:all`
- `yarn verify:all:dev`

Unless the user asks otherwise, do not run long/full pipelines repeatedly when targeted checks are enough.

## Output Contract for Agents

When finishing a task, report:

- files changed
- what behavior changed
- what tests were added/updated (or why none)
- what commands were run
- final suggested git commit message for the step
  - `feat:` for feature behavior
  - `test:` for test-only changes
  - `fix:` for refactors/fixes
  - `chore:` for chores/docs/tooling
- any remaining risks or follow-ups

## Anti-Patterns

- Do not hardcode IPC channel strings.
- Do not invent architecture that is not present in the code.
- Do not bypass security boundaries to "make it work".
- Do not create random new docs files outside `docs/features/` and `docs/adr/`.
- Do not silently skip tests when behavior changed.
