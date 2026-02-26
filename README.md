# Verse Vault

Electron desktop app for managing Bible verses. Built with Electron Forge, React, Vite, TypeScript, and SQLite.

## Dev setup

```bash
yarn install   # installs deps + rebuilds native modules
yarn start     # dev mode with hot reload
yarn lint      # ESLint
yarn format    # Prettier
yarn test      # unit (Vitest) + e2e (Playwright)
yarn test:unit:coverage  # unit tests + v8 coverage report
```

## Development loop

```bash
yarn verify:all
# checks rebuild/lint/format/unit/package/e2e (no dev launch)

yarn verify:all:dev
# same checks, then starts Electron dev

# optional fresh install variants
yarn verify:all:fresh
yarn verify:all:dev:fresh
```

See [docs/00_INDEX.md](docs/00_INDEX.md) for full orientation and architecture.

## Feature workflow

Every feature or refactor follows three explicit phases — don't merge them:

**Phase 1 — Code** (you)
Write the feature or refactor. Commit nothing yet.

**Phase 2 — Tests** (Claude Code: `/test`)
Claude reads what changed via `git diff`, writes Vitest unit tests and/or Playwright e2e tests, then runs them.

**Phase 3 — Docs** (Claude Code: `/docs`)
Claude reads what changed, updates the two living docs only:

- [`docs/02_CODEBASE_MAP.md`](docs/02_CODEBASE_MAP.md) — feature map entry
- [`docs/03_IPC_CONTRACT.md`](docs/03_IPC_CONTRACT.md) — IPC channel table

Then commit everything together.

## Docs

| File                                                 | Purpose                             |
| ---------------------------------------------------- | ----------------------------------- |
| [docs/00_INDEX.md](docs/00_INDEX.md)                 | Re-entry map, quick start           |
| [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)   | Process diagram, design rules       |
| [docs/02_CODEBASE_MAP.md](docs/02_CODEBASE_MAP.md)   | **Living** — where to change things |
| [docs/03_IPC_CONTRACT.md](docs/03_IPC_CONTRACT.md)   | **Living** — all IPC channels       |
| [docs/05_BUILD_RELEASE.md](docs/05_BUILD_RELEASE.md) | Packaging and release               |
| [docs/CHECKLIST.md](docs/CHECKLIST.md)               | Feature done checklist              |
| [docs/adr/](docs/adr/)                               | Architectural decision records      |
