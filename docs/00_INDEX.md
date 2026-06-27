# Verse Vault Docs Index

This repo uses two doc classes:

- Generated current-state docs: `docs/02_CODEBASE_MAP.md`, `docs/03_IPC_CONTRACT.md`
- Human-written guidance: architecture, development workflow, feature docs, and ADRs

When generated docs are stale, update code-adjacent sources and run `yarn docs:generate`.

Prefer generated docs for routes, registrars, seams, and channel lookup. Prefer human-written docs for durable rules and behavior.

## Read In This Order (first time)

1. `README.md` - setup and daily commands
2. `AGENTS.md` - repository rules and task-based doc routing (see "Orientation By Task")

## Task-Based Routing

For "what do I read for task X", see `AGENTS.md` > Orientation By Task. That table is canonical; this file does not duplicate it.

## All Docs (reference catalog)

- `docs/01_ARCHITECTURE.md` - architecture, security boundaries, current schema summary
- `docs/02_CODEBASE_MAP.md` - generated seam map, routes, and IPC registrar inventory
- `docs/03_IPC_CONTRACT.md` - generated IPC channel catalog aligned to `window.db` and handler files
- `docs/04_DEVELOPMENT.md` - validation workflow, hooks, and troubleshooting
- `docs/06_AGENTIC_TESTING_QUALITY_GATE.md` - strict final gate ordering for agent-driven validation
- `docs/CHECKLIST.md` - feature workflow checklist
- `docs/CI_INCIDENTS.md` - GitHub Actions run-control commands for stuck/queued CI runs
- `docs/features/` - short human-written feature docs (see `docs/features/_TEMPLATE.md` for shape)
- `docs/adr/` - architecture decisions only

### Feature Docs Index

Update this table when adding or removing a `docs/features/*.md` file — it is hand-maintained,
not generated.

| File                                  | Scope                                                       |
| ------------------------------------- | ----------------------------------------------------------- |
| `abilities.md`                        | World-scoped abilities CRUD with parent-child links         |
| `campaign-session-scene-backbone.md`  | Campaign/Arc/Act/Session/Scene hierarchy with ordering      |
| `levels.md`                           | Categorized level records scoped to worlds                  |
| `modal-light-mode.md`                 | Light-theme modal dialog fix across CRUD surfaces           |
| `battlemaps.md`                       | World-scoped battlemaps with PixiJS grid/token runtime      |
| `casting.md`                          | Ability casting range/AoE overlays on battlemaps            |
| `worlds.md`                           | World records with thumbnail image uploads                  |
| `statistics.md`                       | World/statblock-level TTRPG statistics framework            |
| `tokens.md`                           | Composable visual battlemap tokens, world/campaign scoped   |
| `ipc-domain-split.md`                 | IPC handlers split into per-domain registrar modules        |
| `optimization.md`                     | Test-suite speed and packaged app size reductions           |
| `markdown-linting-standardization.md` | dprint/markdownlint/Vale partitioned doc linting            |
| `github-actions-setup.md`             | Parallel CI workflow with concurrent quality gates          |
| `statblocks.md`                       | Gameplay container: identity, stats, abilities, token links |
| `characters.md`                       | World-scoped character wiki entries with search and image   |

## Notes

- Do not hand-edit generated rows in `docs/02_CODEBASE_MAP.md` or `docs/03_IPC_CONTRACT.md`.
- Keep feature docs short: purpose, behavior, seams touched, tests, follow-ups.
