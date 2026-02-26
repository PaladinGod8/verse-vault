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
- `docs/CHECKLIST.md`

## Standard Development Loop (Agent + Human)

The repository uses a strict 3-phase workflow. Do not merge phases unless the user explicitly asks.

1. Phase 1 - Code
2. Phase 2 - Tests
3. Phase 3 - Docs

Default ownership:
- Agent implements requested phase
- Human runs full local validation and product verification manually

### Phase 1 - Code

- Implement only the requested feature/refactor.
- Do not also modify docs/tests unless requested.
- Keep changes scoped and architecture-compliant.
- If IPC changes are needed, update in this order:
  1) `src/shared/ipcChannels.ts`
  2) `src/main.ts` handlers
  3) `src/preload.ts` bridge
  4) `forge.env.d.ts` shared types

### Phase 2 - Tests

- Add or update tests for changed behavior.
- Unit tests: `tests/unit/`
- E2E tests: `tests/e2e/`
- Prefer minimal, behavior-focused tests.
- Follow existing patterns in:
  - `tests/unit/App.test.tsx`
  - `tests/e2e/app.test.ts`

### Phase 3 - Docs

For normal feature updates, only touch:
- `docs/02_CODEBASE_MAP.md`
- `docs/03_IPC_CONTRACT.md`

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
- any remaining risks or follow-ups

## Anti-Patterns

- Do not hardcode IPC channel strings.
- Do not invent architecture that is not present in the code.
- Do not bypass security boundaries to "make it work".
- Do not create random new docs files for routine feature changes.
- Do not silently skip tests when behavior changed.
