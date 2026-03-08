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

## CI Run Control

- List recent runs: `gh run list -R PaladinGod8/verse-vault --limit 10`
- Watch latest run: `gh run watch -R PaladinGod8/verse-vault --compact --exit-status`
- Cancel queued/in-progress run: `gh run cancel <run-id> -R PaladinGod8/verse-vault`
- Cancel latest queued run: `gh run cancel "$(gh run list -R PaladinGod8/verse-vault -s queued -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault`
- UI run number (`#37`) is not run ID; map to `databaseId` before canceling.
- Force-cancel queued run if needed: `gh api -X POST repos/PaladinGod8/verse-vault/actions/runs/$runId/force-cancel`
- Verify status after cancel/force-cancel: `gh run view $runId -R PaladinGod8/verse-vault --json status,conclusion,number`
- For queue issues, cancel first; stop/restart runners only when runner health/maintenance requires it.

If running commands, prioritize targeted checks first (`yarn test:unit:run`, then e2e/package when relevant).
