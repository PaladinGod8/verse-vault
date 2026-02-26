# Verse Vault

Verse Vault is a centralized, offline-first Electron desktop platform for managing TTRPG campaigns and creative writing/worldbuilding projects in one local workspace.

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
yarn guard:docs  # fail if architecture/map docs are missing for relevant code/config changes
yarn guard:ipc-docs  # fail if IPC files changed without docs/03_IPC_CONTRACT.md updates
yarn hooks:install  # one-time: enforce repo hooks (docs guards on commit)
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
See [AGENTS.md](AGENTS.md) for cross-agent working rules (Codex/Copilot/Claude).

## Prompting playbook (Codex / Copilot / Claude)

Use this sequence in chat (VS Code or ChatGPT web). Keep phases separate.

### 0. Session start prompt

```text
Read and follow AGENTS.md for this repository.
Use phase-based work only (Code -> Tests -> Docs).
Before edits, restate scope and acceptance criteria.
```

### 1. Feature discovery prompt

```text
Help me define this feature from my description:
<paste feature idea>

Return:
1) problem statement
2) acceptance criteria
3) non-goals
4) affected files
5) whether this should be split into smaller sequential tasks
```

### 2. Task-splitting prompt (when feature is large)

```text
Split this feature into the smallest safe sequential implementation prompts.
Each step must be independently testable and reversible.
For each step, include: scope, files, risks, and done criteria.
```

### 3. Phase 1 prompt (code only)

```text
Phase 1 (Code only):
Implement step <N> only.
Do not write tests or docs in this step.
Follow AGENTS.md architecture and IPC rules.
At end, return: files changed, behavior changed, risks.
```

### 4. Phase 2 prompt (tests only)

```text
Phase 2 (Tests only):
Based on current git diff, add or update unit/e2e tests for the feature.
Do not change production code or docs.
At end, return: test files changed, behaviors covered, gaps.
```

### 5. Manual pipeline + fix loop prompt

You run local checks manually:

```bash
yarn verify:all
```

If it fails, paste failures and use:

```text
Fix only the reported failures from this output:
<paste error output>
Do not make unrelated refactors.
Return exact files changed and why.
```

### 6. Phase 3 prompt (docs only)

```text
Phase 3 (Docs only):
Update docs for the completed feature.
Only modify:
- docs/02_CODEBASE_MAP.md
- docs/03_IPC_CONTRACT.md
Do not change code or tests.
Return exact doc entries updated.
```

### Should agents generate prompts for you?

Yes, as a draft generator. This is useful, but keep control by requiring:

- explicit acceptance criteria and non-goals
- phase boundaries (code vs tests vs docs)
- file scope limits
- your manual validation gate (`yarn verify:all` + product checks)

## Feature workflow

Every feature or refactor follows three explicit phases (do not merge them):

**Phase 1 - Code** (you or agent)
Implement the feature/refactor only. Keep scope focused.

**Phase 2 - Tests** (agent)
Agent reads what changed via `git diff`, writes/updates Vitest unit tests and/or Playwright e2e tests.

**Phase 3 - Docs** (agent)
Agent updates the living docs:

- [`docs/02_CODEBASE_MAP.md`](docs/02_CODEBASE_MAP.md) - feature map entry
- [`docs/03_IPC_CONTRACT.md`](docs/03_IPC_CONTRACT.md) - IPC channel table

You run local validation and manual feature verification, then commit everything together.

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
