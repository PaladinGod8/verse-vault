# Verse Vault

Verse Vault is an offline-first desktop app for managing TTRPG campaigns,
worldbuilding, and writing workflows in one local workspace.

## Why Verse Vault

- Local-first data ownership with SQLite storage
- Offline-first workflows for core campaign and writing operations
- Secure Electron boundaries (`contextIsolation: true`, `nodeIntegration: false`)
- Typed IPC architecture (`Main <-> Preload <-> Renderer`)

## Tech Stack

- Electron 43
- React 19 + Vite 6
- TypeScript
- better-sqlite3
- Tailwind CSS v4
- Zustand 5
- React Router 7

## Getting Started

### Prerequisites

- Node.js 20 LTS (matches CI)
- Yarn 1.22.x
- Windows, macOS, or Linux

Optional (docs linting only):

- [Vale CLI](https://vale.sh/)

Required for secret-scanning lanes:

- `gitleaks` CLI on `PATH`

### Install

```bash
yarn install
```

### Start Development App

```bash
yarn start
```

### Run Core Quality Checks

```bash
yarn lint
yarn format:check
yarn docs:check
yarn guard:contracts
yarn test:unit:run
```

### Keep Generated Docs Current

```bash
yarn docs:generate
yarn docs:check
```

## Project Scripts

Common scripts:

- `yarn start` - start Electron in development mode
- `yarn package` - package app to `out/`
- `yarn test:e2e` - package + run Playwright E2E
- `yarn security:secrets` - gitleaks scan for working tree + git history
- `yarn verify:rapid` - fast local preflight
- `yarn verify:all` - full local verification gate

For the complete script catalog and workflows, see [docs/04_DEVELOPMENT.md](docs/04_DEVELOPMENT.md).

## Documentation

- [docs/00_INDEX.md](docs/00_INDEX.md) - documentation entry point
- [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md) - process boundaries and security rules
- [docs/02_CODEBASE_MAP.md](docs/02_CODEBASE_MAP.md) - generated seam map of where to change code
- [docs/03_IPC_CONTRACT.md](docs/03_IPC_CONTRACT.md) - generated IPC channel and bridge contract
- [docs/04_DEVELOPMENT.md](docs/04_DEVELOPMENT.md) - local setup, workflow, validation, troubleshooting
- [docs/05_BUILD_RELEASE.md](docs/05_BUILD_RELEASE.md) - packaging and release details
- [AGENTS.md](AGENTS.md) - coding agent rules for this repository

## License

MIT
