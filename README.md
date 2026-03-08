# Verse Vault

Verse Vault is a centralized, offline-first Electron desktop platform for managing TTRPG campaigns and creative writing/worldbuilding projects in one local workspace.

Built with Electron Forge, React, Vite, TypeScript, and SQLite.

## Product Direction

Primary Goals:

- Centralize campaign management, session prep, lore, and manuscript work.
- Keep core workflows offline-first with local data ownership.
- Build reusable linked entities (characters, factions, locations, timelines, assets, plot lines).
- Maintain a secure local-first architecture (isolated renderer, typed IPC bridge, main-process DB access).

## Dev setup

```bash
yarn install   # installs deps + rebuilds native modules
yarn start     # dev mode with hot reload
yarn lint      # ESLint
yarn format    # dprint auto-format
yarn test      # unit (Vitest) + e2e (Playwright, includes packaging)
yarn test:e2e  # local e2e (packages first, then runs Playwright)
yarn test:e2e:local  # local alias of test:e2e (packages first, default worker cap)
yarn test:e2e:local:8  # local-only e2e override with 8 workers
yarn test:unit:coverage  # unit tests + v8 coverage report
yarn guard:docs  # fail if architecture/map docs are missing for relevant code/config changes
yarn guard:ipc-docs  # fail if IPC files changed without docs/03_IPC_CONTRACT.md updates
yarn hooks:install  # one-time: enforce repo hooks (docs guards on commit)
```

When a commit contains only formatting changes (no behavior changes), you can use a one-off hook bypass:

```bash
git commit --no-verify -m "<message>"
```

## Development loop

```bash
yarn verify:rapid
# fast local preflight (format/typecheck/lint cache/unit quick in parallel)

yarn verify:all
# checks rebuild/lint/format/unit/package/e2e (no dev launch)

yarn verify:all:dev
# same checks, then starts Electron dev

# optional fresh install variants
yarn verify:all:fresh
yarn verify:all:dev:fresh
```

Recommended cadence:

1. Run `yarn verify:rapid` while iterating.
2. Run `yarn verify:all` before push/PR.
3. Push branch and use GitHub Actions (`.github/workflows/ci.yml`) as the remote paper trail:
   - logs per job/step
   - `coverage-report` artifact
   - `packaged-app` artifact
   - `playwright-report` artifact

## Developer Workflow Commands

### Agent mode and effort controls

```text
ASK
AGENT
Mode: Medium
Mode: High
```

### Githook guardrails

```bash
yarn guard:docs --staged
```

If githook checks fail, this prompt is the standard recovery template:

```text
I encountered a failure when trying to commit because of the githooks guardrails (inclusive of linting, tsc, and guard-docs)

check the scripts/logs/ and find the latest githook failure to see the full breakdown.

please update all relevant livingdocs and fix all relevant linting, and tsc issues.
```

### Targeted test commands

```bash
npx vitest <test-file-path> --no-file-parallelism --reporter=verbose
npx vitest <test-file-path> -t="<specific test name>" --no-file-parallelism --reporter=verbose
yarn test:unit:run --no-file-parallelism
```

### VS Code markdown preview

1. Click the markdown file.
2. Click inside the markdown content so the text cursor appears.
3. Press `CTRL + SHIFT + V`.

## Self-Hosted Runner Ops (Windows)

Use repository-local scripts to manage all configured runners for this repo.
Run from repository root (`c:\code\personal\verse-vault`):

```bash
cmd /c yarn runner:status
cmd /c yarn runner:start
cmd /c yarn runner:stop
cmd /c yarn runner:restart
```

Direct PowerShell equivalent:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action start
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action stop
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\runner-services.ps1 -Action restart
```

Notes:

- `start` / `stop` / `restart` auto-request elevation (UAC) when needed.
- If your PowerShell profile blocks `yarn.ps1`, prefer `cmd /c yarn ...` as shown above.

## GitHub Actions In Terminal

Use GitHub CLI (`gh`) from any terminal (including VS Code terminal).

```bash
# list recent runs
gh run list -R PaladinGod8/verse-vault --limit 10

# watch the current in-progress run live (compact output)
gh run watch "$(gh run list -R PaladinGod8/verse-vault -s in_progress -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault --compact --exit-status

# fast local preflight before push
yarn verify:rapid

# local e2e (packages first, then Playwright)
yarn test:e2e

# local e2e override for high-core machines
yarn test:e2e:local:8
```

Use VSCodeCounter on major changes.

See [docs/00_INDEX.md](docs/00_INDEX.md) for orientation and architecture.
See [docs/features/github-actions-setup.md](docs/features/github-actions-setup.md) for CI pipeline details and artifacts.
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

Note:

- convert split steps into copy-pastable prompts in markdown under docs/prompts/
- can be carried out in sequential order regardless of whether it is in a new chat / context window or not
- write hook-required living docs as you go in each small commit step
- require one final commit message line per step using:
  - `feat:` for feature behavior
  - `test:` for test-only changes
  - `fix:` for refactors/fixes
  - `chore:` for chores/docs/tooling

### 3. Phase 1 prompt (code + required docs)

```text
Phase 1 (Code + required docs):
Implement step <N> only.
Do not write tests in this step.
If githooks require docs updates for touched files, update only those living docs in this same step.
Follow AGENTS.md architecture and IPC rules.
At end, return: files changed, behavior changed, risks, final git commit message.
```

### 4. Phase 2 prompt (tests only)

```text
Phase 2 (Tests only):
Based on current git diff, add or update unit/e2e tests for the feature.
Do not change production code.
If githooks require docs updates for touched files, update only those living docs in this same step.
At end, return: test files changed, behaviors covered, gaps, final git commit message.
```

Notes:

- write more tests if pipeline indicates <80% code coverage on pipeline failure

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
Return exact files changed, why, and final git commit message.
```

### 6. Phase 3 prompt (feature docs only)

```text
Phase 3 (Feature docs only):
Document the completed feature in docs/features/<feature-slug>.md.
Create the file if missing, otherwise update it.
Do not do broad final docs reconciliation in this step.
Do not change code or tests.
Return exact doc entries updated and final git commit message.
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
Implement the feature/refactor. Keep scope focused. Keep githook-required living docs in the same small commit.

**Phase 2 - Tests** (agent)
Agent reads what changed via `git diff`, writes/updates Vitest unit tests and/or Playwright e2e tests, and keeps githook-required living docs in the same small commit when needed.

**Phase 3 - Feature docs** (agent)
Agent creates or updates the feature document:

- [`docs/features/<feature-slug>.md`](docs/features/) - feature intent, scope, and delivered behavior

Every small step ends with one proposed commit message line:

- `feat:` feature behavior
- `test:` test-only changes
- `fix:` refactors/fixes
- `chore:` chores/docs/tooling

Run local validation and manual feature verification per step, then commit per step (small batch size).

## Docs

| File                                                 | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| [docs/00_INDEX.md](docs/00_INDEX.md)                 | Re-entry map, quick start, product direction      |
| [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)   | Process diagram and engineering rules             |
| [docs/02_CODEBASE_MAP.md](docs/02_CODEBASE_MAP.md)   | **Living** - where to change feature code         |
| [docs/03_IPC_CONTRACT.md](docs/03_IPC_CONTRACT.md)   | **Living** - IPC channels and payload contracts   |
| [docs/features/](docs/features/)                     | Feature-level docs, one markdown file per feature |
| [docs/05_BUILD_RELEASE.md](docs/05_BUILD_RELEASE.md) | Packaging and release                             |
| [docs/CHECKLIST.md](docs/CHECKLIST.md)               | Feature completion checklist                      |
| [docs/TODO.md](docs/TODO.md)                         | Product roadmap and backlog                       |
| [docs/adr/](docs/adr/)                               | Architectural decision records                    |
