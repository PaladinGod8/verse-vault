# GitHub Copilot Instructions for Verse Vault

Follow `AGENTS.md` in the repository root as the primary project contract.

## Required Workflow

Use the 3-phase flow unless the user explicitly asks to combine steps:

1. Code
2. Tests
3. Docs

For docs phase on normal feature work, only modify:

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

If running commands, prioritize targeted checks first (`yarn test:unit:run`, then e2e/package when relevant).
