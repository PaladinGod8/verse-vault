# Verse Vault - Re-entry Index

## Quick Start

```bash
yarn install        # installs deps + rebuilds native modules (postinstall)
yarn start          # dev mode with hot reload
yarn lint           # ESLint check
yarn format:check   # Prettier check (no writes)
yarn format         # auto-format
```

## Product Direction

Verse Vault is being built as a centralized, offline-first desktop platform for:
- TTRPG campaign management
- Creative writing workflows
- Worldbuilding knowledge systems

Core design intent:
- One local workspace for campaign operations, lore, notes, and manuscript drafting
- Local-first data ownership with no cloud dependency for core workflows
- Expandable entity model for campaign, world, manuscript, and session domains

## Where to Start Reading

| Question | File |
|----------|------|
| How does the app boot? | [src/main.ts](../src/main.ts) |
| What APIs does the renderer have? | [src/preload.ts](../src/preload.ts) -> `window.db` |
| What routes/pages exist? | [src/renderer/App.tsx](../src/renderer/App.tsx) |
| What's in the database? | [src/database/db.ts](../src/database/db.ts) |
| What IPC channel names exist? | [src/shared/ipcChannels.ts](../src/shared/ipcChannels.ts) |
| Global TS types | [forge.env.d.ts](../forge.env.d.ts) (`Verse` scaffold + `DbApi`) |

## Docs

- [01_ARCHITECTURE.md](01_ARCHITECTURE.md) - data-flow diagram + security rules
- [02_CODEBASE_MAP.md](02_CODEBASE_MAP.md) **(LIVING)** - where to change things
- [03_IPC_CONTRACT.md](03_IPC_CONTRACT.md) **(LIVING)** - all IPC channels and payloads
- [05_BUILD_RELEASE.md](05_BUILD_RELEASE.md) - packaging and release
- [CHECKLIST.md](CHECKLIST.md) - feature workflow
- [TODO.md](TODO.md) - roadmap and backlog
- [adr/](adr/) - architectural decision records

## Key Facts

- **Stack**: Electron 35 / React 19 / Vite 6 / TypeScript / better-sqlite3 12 / Tailwind CSS v4 / Zustand 5 / React Router 7
- **DB file location**: `%APPDATA%\\Verse Vault\\verse-vault.db` (Windows userData)
- **Routing**: HashRouter (no web server needed)
- **Client state**: Zustand stores in `src/store/` (pattern exists, not yet wired to feature domains)
- **Package manager**: Yarn 1.22
- **Offline-first baseline**: SQLite + IPC architecture keeps core capabilities local by default
