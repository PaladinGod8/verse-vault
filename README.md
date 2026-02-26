# Verse Vault

Verse Vault is a centralized, offline-first Electron desktop platform for managing TTRPG campaigns and creative writing/worldbuilding projects in one local workspace.

Current implementation status:
- The Electron + React + SQLite foundation is in place.
- The current persistence/IPC surface is a starter `verses` CRUD scaffold that will be expanded into campaign, world, and manuscript domain entities.

Built with Electron Forge, React, Vite, TypeScript, and SQLite.

## Product Direction

Primary goals:
- Centralize campaign management, session prep, lore, and manuscript work.
- Keep core workflows offline-first with local data ownership.
- Build reusable linked entities (characters, factions, locations, timelines, assets, plot lines).
- Maintain a secure local-first architecture (isolated renderer, typed IPC bridge, main-process DB access).

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

Use VSCodeCounter on major changes.

See [docs/00_INDEX.md](docs/00_INDEX.md) for orientation and architecture.

## Feature workflow

Every feature or refactor follows three explicit phases (do not merge them):

**Phase 1 - Code** (you)
Write the feature or refactor. Commit nothing yet.

**Phase 2 - Tests** (Claude Code: `/test`)
Claude reads what changed via `git diff`, writes Vitest unit tests and/or Playwright e2e tests, then runs them.

**Phase 3 - Docs** (Claude Code: `/docs`)
Claude reads what changed and updates the living docs:

- [`docs/02_CODEBASE_MAP.md`](docs/02_CODEBASE_MAP.md) - feature map entry
- [`docs/03_IPC_CONTRACT.md`](docs/03_IPC_CONTRACT.md) - IPC channel table

Then commit everything together.

## Docs

| File                                                 | Purpose                                         |
| ---------------------------------------------------- | ----------------------------------------------- |
| [docs/00_INDEX.md](docs/00_INDEX.md)                 | Re-entry map, quick start, product direction    |
| [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)   | Process diagram and engineering rules           |
| [docs/02_CODEBASE_MAP.md](docs/02_CODEBASE_MAP.md)   | **Living** - where to change feature code       |
| [docs/03_IPC_CONTRACT.md](docs/03_IPC_CONTRACT.md)   | **Living** - IPC channels and payload contracts |
| [docs/05_BUILD_RELEASE.md](docs/05_BUILD_RELEASE.md) | Packaging and release                           |
| [docs/CHECKLIST.md](docs/CHECKLIST.md)               | Feature completion checklist                    |
| [docs/TODO.md](docs/TODO.md)                         | Product roadmap and backlog                     |
| [docs/adr/](docs/adr/)                               | Architectural decision records                  |
