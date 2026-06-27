# GitHub Copilot Instructions for Verse Vault

Follow `AGENTS.md` in the repository root as the primary project contract.

## Required Workflow

Use a test-first (TDD) workflow unless the user explicitly asks otherwise: write one test, watch it fail, write minimal code to pass it, repeat — then refactor once green. After the feature is green, do a docs step.

1. TDD (code + tests, vertical slices)
2. Docs

For the docs step on normal feature work, only modify:

- `docs/02_CODEBASE_MAP.md`
- `docs/03_IPC_CONTRACT.md`

## Non-Negotiable Technical Rules

- Keep Electron security boundary:
  - `contextIsolation: true`
  - `nodeIntegration: false`
- Never import Node APIs in renderer code.
- Never call `ipcRenderer` directly in renderer code.
- Use `window.db` bridge only.
- Keep IPC channel constants in `src/shared/ipcChannels.ts` (no magic strings).
- Keep `better-sqlite3` in main process only.

## Testing and Validation

- Add or update tests for behavior changes.
- Unit tests go under `tests/unit/`.
- E2E tests go under `tests/e2e/`.
- Prefer focused tests over broad rewrites.

## CI Run Control

See `docs/CI_INCIDENTS.md` for GitHub Actions run-control commands (list/watch/cancel/force-cancel).

If running commands, prioritize targeted checks first (`yarn test:unit:run`, then e2e/package when relevant).
