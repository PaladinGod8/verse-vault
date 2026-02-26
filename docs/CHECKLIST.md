# Feature Workflow Checklist

## Every Time You Add or Change a Feature

### 1. Code

- [ ] Implement feature (UI component, Zustand store, IPC handler, DB schema changes)
- [ ] If new IPC channel: add constant to `src/shared/ipcChannels.ts` first
- [ ] Run `yarn lint` and fix any errors
- [ ] Run `yarn format`

### 2. Docs (mandatory)

- [ ] `docs/02_CODEBASE_MAP.md` - add/update the Feature Map entry:
  - UI file | store file | IPC channels used | main handler | storage location
- [ ] `docs/03_IPC_CONTRACT.md` - add/update any channels touched:
  - constant name, string value, direction, request payload, response payload, handler file
- [ ] Run `yarn guard:docs` to verify architecture/map docs were updated when required
- [ ] Run `yarn guard:ipc-docs` to verify IPC changes are paired with contract doc updates
- [ ] Update scope language if needed so docs still reflect platform direction:
  - centralized + offline-first TTRPG campaign management + creative writing/worldbuilding

### 3. ADR (only if an architectural decision was made)

Write a short ADR in `docs/adr/` if you:

- Added a new storage layer
- Changed the IPC pattern (for example switched to `send`/`on` for one-way messages)
- Changed a security rule (for example modified context isolation settings)
- Made a significant dependency or tech choice

Otherwise, skip the ADR.

### 4. Never

- Do not create new doc files outside `docs/` or outside the files listed in `docs/00_INDEX.md`
- Do not hardcode IPC channel strings; always use `src/shared/ipcChannels.ts`
- Do not import `ipcRenderer` directly in renderer code; use `window.db`
- Do not ship cloud-only flows for core features; preserve offline-first behavior

---

## Weekly Sanity Ritual (5 minutes)

1. Skim `docs/02_CODEBASE_MAP.md` and confirm it reflects current code.
2. Skim `docs/03_IPC_CONTRACT.md` for missing channel updates.
3. Resolve or delete TODO items that are no longer relevant.
4. Verify current priorities still align with the platform direction in `README.md` and `docs/TODO.md`.
