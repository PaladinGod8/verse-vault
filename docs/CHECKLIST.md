# Feature Workflow Checklist

## Every Time You Add or Change a Feature

Command reference: see `README.md` and `docs/04_DEVELOPMENT.md` for the full command list.

### 1. Code

- [ ] Build the feature or refactor with architecture boundaries intact.
- [ ] New IPC? Update `src/shared/ipcChannels.ts` first, then main handlers, preload, shared contract types.
- [ ] Run `yarn verify:rapid` while iterating.
- [ ] Remove stale ESLint override entries when a file is back within budget.

### 2. Docs

- [ ] Run `yarn docs:generate` when shared contracts, routes, registrars, or IPC mappings change.
- [ ] Do not hand-edit generated rows in `docs/02_CODEBASE_MAP.md` or `docs/03_IPC_CONTRACT.md`.
- [ ] Feature-specific behavior goes in `docs/features/<feature>.md`, use `docs/features/_TEMPLATE.md`.
- [ ] Run `yarn guard:docs`, `yarn guard:ipc-docs`, `yarn guard:contracts`.

### 3. Local Quality Gate

- [ ] Run `yarn verify:all` before push/PR.
- [ ] If the gate fails, fix only the reported failures and rerun until green.

### 4. Test Helper Conventions

- [ ] Use shared fixtures from `tests/helpers/factories.ts` when tests need repeated full-shape data.
- [ ] Use `setupWindowDb()` / `resetWindowDb()` from `tests/helpers/ipcMock.ts` for substantial `window.db` mocking.
- [ ] Await all async work fully; avoid raw timing waits.

### 5. ADR

- [ ] Add an ADR only for real architecture decisions: IPC pattern changes, security boundary changes, or major storage/technology changes.

### 6. Never

- [ ] Do not hardcode IPC channel strings.
- [ ] Do not import Node/Electron APIs directly in renderer code.
- [ ] Do not hand-edit generated artifacts or commit ignored build outputs.
- [ ] Do not let new source/test files bypass lint budgets without a deliberate override and follow-up.

## Weekly Sanity Ritual

1. Run `yarn docs:check` and `yarn guard:contracts`.
2. Skim `docs/02_CODEBASE_MAP.md` and `docs/03_IPC_CONTRACT.md` for drift.
3. Remove dead TODOs and stale ESLint override entries.
4. Check that priorities still match `README.md` and `docs/TODO.md`.
