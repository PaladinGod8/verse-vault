# Feature Workflow Checklist

## Every Time You Add or Change a Feature

Command reference: use `README.md` -> **Developer Workflow Commands** for the canonical command list.

### 1. Code

- [ ] Implement feature (UI component, Zustand store, IPC handler, DB schema changes)
- [ ] If new IPC channel: add constant to `src/shared/ipcChannels.ts` first
- [ ] If adding a new IPC entity/domain, create `src/main/ipc/register<Domain>Handlers.ts` and wire it from `src/main.ts` (keep `src/main.ts` bootstrap-only; no inline `ipcMain.handle` blocks)
- [ ] Run `yarn verify:rapid` during implementation for fast local feedback
- [ ] Run `yarn lint` (cached default) and `yarn format:check` before committing code changes
- [ ] Use `yarn lint:full` when debugging suspected cache-related lint anomalies (uncached full run)
- [ ] If you touch a file that has an ESLint override in `.eslintrc.cjs` (annotated with `// TODO: remove override after <feature>`), check whether your changes now bring it within budget — if so, remove the override entry and verify `yarn lint` still passes

### 2. Docs (mandatory)

- [ ] `docs/02_CODEBASE_MAP.md` - add/update the Feature Map entry:
  - UI file | store file | IPC channels used | main handler | storage location
- [ ] `docs/03_IPC_CONTRACT.md` - add/update any channels touched:
  - constant name, string value, direction, request payload, response payload, handler file
- [ ] Run `yarn guard:docs` to verify architecture/map docs were updated when required
- [ ] Run `yarn guard:ipc-docs` to verify IPC changes are paired with contract doc updates
- [ ] Update scope language if needed so docs still reflect platform direction:
  - centralized + offline-first TTRPG campaign management + creative writing/worldbuilding

### 3. Local Quality Gate

- [ ] Run `yarn verify:all` before push/PR (strict ordered gate: rebuild -> format/type/lint -> unit coverage -> package -> e2e)
- [ ] If `verify:all` fails, fix only reported failures and rerun until green

### Test Helper Conventions (for new or updated tests)

- [ ] Prefer shared entity factories from `tests/helpers/factories.ts` (for example `buildWorld()`, `buildToken()`) when tests need repeated or full-shape entity fixtures
- [ ] If deterministic factory IDs matter for assertions, call `resetFactoryIds()` in `beforeEach`
- [ ] Prefer `setupWindowDb()` from `tests/helpers/ipcMock.ts` when tests require substantial `window.db` mocking; keep tiny one-off inline mocks when they are clearer
- [ ] After `setupWindowDb()`, override only the specific mocked methods needed by the test
- [ ] Call `resetWindowDb()` in `beforeEach` when using the IPC mock harness

### 4. Remote CI Paper Trail

- [ ] Push branch and open PR to `main`
- [ ] Confirm GitHub Actions CI is green (`fast-checks`, `package`, `e2e`, `ci-summary`)
- [ ] If CI fails, use workflow/job/step logs and artifacts (`coverage-report`, `packaged-app`, `playwright-report`) as debugging paper trail

### 5. ADR (only if an architectural decision was made)

Write a short ADR in `docs/adr/` if you:

- Added a new storage layer
- Changed the IPC pattern (for example switched to `send`/`on` for one-way messages)
- Changed a security rule (for example modified context isolation settings)
- Made a significant dependency or tech choice

Otherwise, skip the ADR.

### 6. Never

- Do not create new doc files outside `docs/` or outside the files listed in `docs/00_INDEX.md`
- Do not hardcode IPC channel strings; always use `src/shared/ipcChannels.ts`
- Do not import `ipcRenderer` directly in renderer code; use `window.db`
- Do not import `electron` in renderer files — ESLint `no-restricted-imports` will error; route all IPC through `window.db`
- Do not import from `src/main.ts`, `src/main/**`, or `src/database/**` in renderer files — ESLint `import/no-restricted-paths` enforces process-layer isolation; `src/shared/**` and `forge.env.d.ts` are unrestricted
- Do not import from `src/renderer/**` in `src/preload.ts` — same boundary rule applies
- Do not ship cloud-only flows for core features; preserve offline-first behavior
- Do not commit generated artifacts — `dist/`, `out/`, `.vite/`, and `coverage/` are enforced by `.gitignore` and must never be staged or committed
- Do not let new `src/**` files exceed 400 lines or new `tests/**` files exceed 600 lines — ESLint `max-lines` will error; split the file instead
- Do not write functions (outside React components and test callbacks) exceeding 80 lines — ESLint `max-lines-per-function` will error; extract helpers instead
- Do not write functions with cyclomatic complexity > 15 — ESLint `complexity` will error; simplify branching logic or extract sub-functions

---

## Weekly Sanity Ritual (5 minutes)

1. Skim `docs/02_CODEBASE_MAP.md` and confirm it reflects current code.
2. Skim `docs/03_IPC_CONTRACT.md` for missing channel updates.
3. Scan `.eslintrc.cjs` overrides for `// TODO: remove override after` entries — if the referenced feature has landed, remove the override and verify `yarn lint` passes.
4. Resolve or delete TODO items that are no longer relevant.
5. Verify current priorities still align with the platform direction in `README.md` and `docs/TODO.md`.
