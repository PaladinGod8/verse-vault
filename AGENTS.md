# Verse Vault Agent Guide

Shared repo contract for coding agents. Keep this file short; route detail into task-matched docs.

## Priority

1. Explicit user request in the current chat/session
2. This `AGENTS.md`
3. File-level or tool-level instructions (for example `.claude/CLAUDE.md`)
4. Existing project docs and code conventions

If instructions conflict, follow the highest-priority item and call out the conflict in your response.

## Response Style (Default-On, All Agents)

Applies regardless of agent (Claude Code, Codex, etc.) and overrides any agent-level default — repo-local instructions win over global config.

Respond terse, compressed, "smart caveman" style. Keep all technical substance; drop only fluff.

- Drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for").
- No tool-call narration, no decorative tables/emoji, no dumping long raw error logs unless asked — quote shortest decisive line.
- Standard tech acronyms OK (DB/API/HTTP); never invent abbreviations reader can't decode.
- Keep verbatim: code blocks, exact error strings, commit-type keywords (feat/fix/test/chore), API/CLI names, file paths.
- Active every response, every session, this repo. No revert after many turns. Off only if user says "stop caveman" / "normal mode" for that session.
- Drop the style (write normal) for: security warnings, irreversible-action confirmations, multi-step sequences where omitted conjunctions risk misread, final code/commit message/PR text.
- Never self-reference or announce the style.

Pattern: `[thing] [action] [reason]. [next step].`
Example: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

## Project Baseline

- Stack: Electron 35, React 19, Vite 6, TypeScript, better-sqlite3, Tailwind v4, Zustand 5, React Router 7
- Architecture: Main <-> Preload <-> Renderer
- Security boundary:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - no Node.js APIs in renderer
- IPC rules:
  - use `window.db` in renderer
  - never call `ipcRenderer` directly in renderer code
  - all channel names must come from `src/shared/ipcChannels.ts`
- Database:
  - `better-sqlite3` only in main process
  - schema updates in `src/database/db.ts`

## Orientation By Task

Read only the docs that match the task. Prefer generated current-state docs for seams, routes, and IPC contracts.

- IPC change: `docs/03_IPC_CONTRACT.md`, `docs/01_ARCHITECTURE.md` Rules 1-5, relevant `docs/features/<feature>.md`
- Renderer page/route: `docs/02_CODEBASE_MAP.md` Routes, relevant `docs/features/<feature>.md`
- Schema/migration: `docs/01_ARCHITECTURE.md` Current Schema Summary, `src/database/db.ts`
- Tests: `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`
- Feature docs: `docs/features/_TEMPLATE.md`
- Broad architecture/orientation: `docs/00_INDEX.md`, `docs/01_ARCHITECTURE.md`, `docs/02_CODEBASE_MAP.md`
- New dependency/tool/framework/platform added by your change: `docs/07_TECH_STACK.md`
- Full delivery workflow: `docs/CHECKLIST.md`
- CI incident: `docs/CI_INCIDENTS.md`

Default entrypoint: `docs/00_INDEX.md`.

## Standard Development Loop (Agent + Human)

The repository uses a 2-step workflow. Do not skip the docs step unless the user explicitly asks.

1. TDD - Code + Tests (test-first)
2. Docs

Exception:

- githook-required living docs updates are part of the same small commit as the TDD step when those files are touched.
- generated updates to `docs/02_CODEBASE_MAP.md` and `docs/03_IPC_CONTRACT.md` are allowed in the TDD step when the underlying code-adjacent sources changed

Default ownership:

- Agent implements the requested step
- Human runs full local validation and product verification manually

### TDD - Code + Tests

Follow the repo-specific TDD skill for your agent surface: Claude Code uses `.claude/skills/tdd/SKILL.md`; Codex uses `$verse-vault-tdd` from `~/.codex/skills/verse-vault-tdd` (or `$CODEX_HOME/skills/verse-vault-tdd`). This file stays canonical for repo rules.

- Work red-green-refactor in vertical slices.
- Unit tests: `tests/unit/` (Vitest + `@testing-library/react`, jsdom). Mock `window.db`; never import main-process code.
- E2E tests: `tests/e2e/` (Playwright; requires `yarn package` first).
- Follow existing patterns in `tests/unit/App.test.tsx` and `tests/e2e/app.test.ts`.
- Run `yarn docs:generate` when shared contracts, routes, registrars, or IPC mappings change.
- Keep changes scoped and architecture-compliant.
- If IPC changes are needed, update in this order:
  1. `src/shared/ipcChannels.ts`
  2. `src/main.ts` handlers
  3. `src/preload.ts` bridge
  4. `forge.env.d.ts` shared types
- For final pre-merge validation, run the strict ordered quality gate in `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`.
- Async/race-condition rules for unit and E2E tests: see the Gate 2 and Gate 4 checklists in `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`.

Codex note: the repo-local source for the Codex skill lives in this checkout at `.codex/skills/verse-vault-tdd/SKILL.md`. Run `yarn skills:sync` to install it to `~/.codex/skills/verse-vault-tdd` (or `$CODEX_HOME/skills/verse-vault-tdd`); keep it aligned with `.claude/skills/tdd/SKILL.md`, and treat this `AGENTS.md` section as the source of truth for repo rules.

### Fix Bug

For bug fixes specifically, follow the repo-specific Fix Bug skill for your agent surface: Claude Code uses `.claude/skills/fix-bug/SKILL.md`; Codex uses `$verse-vault-fix-bug` from `~/.codex/skills/verse-vault-fix-bug` (or `$CODEX_HOME/skills/verse-vault-fix-bug`). It layers root-cause analysis and the repo's main/preload/renderer layer rules on top of the same Chicago School TDD workflow as the TDD skill above.

Codex note: the repo-local source for the Codex skill lives in this checkout at `.codex/skills/verse-vault-fix-bug/SKILL.md`. Run `yarn skills:sync` to install it to `~/.codex/skills/verse-vault-fix-bug` (or `$CODEX_HOME/skills/verse-vault-fix-bug`); keep it aligned with `.claude/skills/fix-bug/SKILL.md`, and treat this `AGENTS.md` section as the source of truth for repo rules.

### Prompt-Splitting Requirement

When an agent creates sequential implementation prompts under `docs/prompts/`, include a final step named `Final Quality Gate` that references `docs/06_AGENTIC_TESTING_QUALITY_GATE.md` and requires all gates to pass in order.

### Docs

For normal feature updates:

- create or update `docs/features/<feature-slug>.md`
- keep feature docs short and behavior-oriented; use `docs/features/_TEMPLATE.md`
- do not do broad final reconciliation here; living-doc updates should already be done in earlier small commits
- if your change introduces a new technology, library, framework, build tool, test tool, lint/doc tool, security tool, or platform dependency, update `docs/07_TECH_STACK.md` in same change
- do not update `docs/07_TECH_STACK.md` for routine version bumps or changes that stay within existing stack

Add an ADR in `docs/adr/` only for real architecture decisions:

- storage model change
- IPC pattern change
- security boundary change
- significant technology decision

## Commands

Primary local checks:

- `yarn lint`
- `yarn format:check`
- `yarn docs:check`
- `yarn guard:contracts`
- `yarn test:unit:run`
- `yarn package`
- `yarn test:e2e`

Full pipeline:

- `yarn verify:all`
- `yarn verify:all:dev`

One-off hook bypass commands (use sparingly):

- `git commit --no-verify -m "<message>"`
- `git push --no-verify origin`

CI incidents: use `docs/CI_INCIDENTS.md`. Unless the user asks otherwise, do not rerun long pipelines when targeted checks are enough.

Safe, low-risk, run freely without asking first: `yarn type-check` / `yarn tsc --noEmit`, `yarn docs:generate`, `yarn docs:check` (and their underlying scripts `node scripts/generate-codebase-map.cjs`, `node scripts/generate-ipc-contract-docs.cjs`). Claude Code has these allow-listed in `.claude/settings.json`; Codex has no per-command allowlist, so this is a convention only — confirm with the user before assuming zero-prompt execution on Codex.

## Agent Setup: Codex and Claude

Both agents must be able to set up from this repo alone, with no tribal knowledge.

- Claude Code reads `.claude/skills/tdd/SKILL.md` and `.claude/skills/docs/SKILL.md` directly from the checkout (project-local, auto-loaded).
- Codex has no project-local skill discovery, so its skill source lives in the repo at `.codex/skills/verse-vault-tdd/SKILL.md` and must be installed into a global path.
- Run `yarn skills:sync` to copy `.codex/skills/verse-vault-tdd` to `~/.codex/skills/verse-vault-tdd` (or `$CODEX_HOME/skills/verse-vault-tdd`) and `.claude/skills/tdd` to `~/.claude/skills/verse-vault-tdd`, so the same TDD conventions are available globally for either agent on this machine.
- When the TDD workflow changes, update `.claude/skills/tdd/SKILL.md` and `.codex/skills/verse-vault-tdd/SKILL.md` together, then rerun `yarn skills:sync`.

Required vs optional skills:

- Required (repo-process-critical): the TDD skill (`tdd` for Claude, `verse-vault-tdd` for Codex) and the Claude `docs` skill — these encode this repo's actual workflow contract.
- Optional (general productivity, not enforced by guards or hooks): things like `caveman`, `caveman-compress`, `grill-me`, `codebase-design`. Use them if already configured on the machine; do not require another agent to install them to work on this repo.

Token-saving expectations:

- Prefer targeted reads/greps over loading whole files or directories when a path or symbol is already known.
- Run targeted test files (`npx vitest <file>`) while iterating; reserve `yarn test:unit:run` / `yarn verify:all` for pre-merge gates.
- Use `yarn guard:contracts` and `yarn docs:check` (cheap, fast) before reaching for the full `yarn verify:all` pipeline.
- These are defaults, not hard rules — a full pipeline run is still required before declaring merge-ready, per `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`.

## Output Contract for Agents

When finishing a task, report:

- files changed
- what behavior changed
- what tests were added/updated (or why none)
- what commands were run
- final suggested git commit message for the step
  - `feat:` for feature behavior
  - `test:` for test-only changes
  - `fix:` for refactors/fixes
  - `chore:` for chores/docs/tooling
- any remaining risks or follow-ups

## Anti-Patterns

- Do not hardcode IPC channel strings.
- Do not invent architecture that is not present in the code.
- Do not bypass security boundaries to "make it work".
- Do not create random new docs files outside `docs/features/` and `docs/adr/`.
- Do not hand-edit generated rows in `docs/02_CODEBASE_MAP.md` or `docs/03_IPC_CONTRACT.md`.
- Do not silently skip tests when behavior changed.
