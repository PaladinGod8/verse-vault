# verse-vault-fix-bug

Guide for fixing bugs in Verse Vault following Chicago School TDD and the repo's IPC/layer rules. Use when a bug is reported, a defect needs fixing in existing functionality, or behavior violates the user's mental model.

Treat the repo-root `AGENTS.md` as the canonical process contract for Verse Vault. This skill is the Codex entrypoint for the repo's bug-fix workflow; if this skill and `AGENTS.md` disagree, `AGENTS.md` wins.

This is the Codex mirror of `.claude/skills/fix-bug/SKILL.md`. Same philosophy and conventions, packaged for `$CODEX_HOME/skills/verse-vault-fix-bug` (default `~/.codex/skills/verse-vault-fix-bug`). Keep both files in sync when either changes.

Fix bugs using Chicago School TDD (state-based testing, same philosophy as `verse-vault-tdd`), root cause analysis, and the repo's main/preload/renderer layering rules.

## Workflow

1. **Reproduce & understand**: trigger the bug, identify expected vs. actual behavior, locate the root cause.
2. **Write failing test (Red)**: write a test that exposes the bug and verifies CORRECT behavior; confirm it FAILS before any fix.
3. **Fix & verify (Green)**: implement the minimal fix; confirm the test PASSES and no existing tests regress.

## Phase 1: Reproduce & Understand

1. **Reproduce**: follow the exact steps to trigger the bug (run `yarn start`, or run the relevant unit/E2E test if one already exists).
2. **Expected**: what SHOULD happen (user's mental model).
3. **Actual**: what IS happening (current behavior).
4. **Root cause**: WHY it's happening (code analysis).

### Locate in architecture

Reference: `docs/01_ARCHITECTURE.md`, `docs/02_CODEBASE_MAP.md`.

| Layer               | Location                                                                   | What to look for                                                    |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Main (IPC handlers) | `src/main/ipc/*.ts`, `src/main.ts`                                         | Wrong channel wiring, validation gaps, missing handler registration |
| Database            | `src/database/*.ts`                                                        | Schema/migration mismatches, query logic errors                     |
| Preload bridge      | `src/preload.ts`                                                           | Missing/incorrect `window.db` method exposure                       |
| Shared contracts    | `src/shared/contracts/*.ts`, `forge.env.d.ts`, `src/shared/ipcChannels.ts` | Type/channel mismatches between main and renderer                   |
| Renderer            | `src/renderer/**`                                                          | Component state bugs, stale props, incorrect `window.db` usage      |

Respect the layer boundaries in `docs/01_ARCHITECTURE.md` Rules of the Road while diagnosing -> never assume the renderer can reach `better-sqlite3` directly; trace through `window.db` -> preload -> IPC channel -> main handler -> `src/database`.

### Invariants

Check whether the bug violates an invariant that should be enforced close to the data (e.g. a shared helper, a DB constraint, or an IPC validation helper in `src/main/ipc/validation.ts`) rather than re-checked ad hoc at every call site.

## Phase 2: Write Failing Test (Red)

- Test state changes and return values, not interactions.
- Focus on the "what" (observable outcomes), not the "how" (method calls).
- Mock `window.db` to return data in renderer tests -> don't assert on call counts/order unless that ordering is the actual bug.
- Prefer integration-style tests that read like a spec.

### Test location

| Bug location         | Test location                                         |
| -------------------- | ----------------------------------------------------- |
| `src/main/ipc/*.ts`  | `tests/unit/ipc/*.test.ts`                            |
| `src/database/*.ts`  | `tests/unit/database/*.test.ts`                       |
| `src/preload.ts`     | `tests/unit/preload.test.ts`                          |
| `src/shared/*.ts`    | `tests/unit/shared/*.test.ts`                         |
| `src/renderer/**`    | `tests/unit/renderer/**.test.tsx`                     |
| End-to-end user flow | `tests/e2e/*.test.ts` (requires `yarn package` first) |

Follow existing patterns in `tests/unit/App.test.tsx` and `tests/e2e/app.test.ts`. Mock `window.db` for renderer unit tests -> never import main-process code into renderer tests.

### Run test (should FAIL)

```bash
yarn test:unit:run -- -t "<test name>"
```

## Phase 3: Fix & Verify (Green)

1. **Minimal change**: fix only what's broken.
2. **Fix at the right layer**: prefer the shared/database layer over patching symptoms in the renderer.
3. **Maintain IPC ordering** if the fix touches a channel: `src/shared/ipcChannels.ts` -> `src/main.ts`/`src/main/ipc/*.ts` handlers -> `src/preload.ts` bridge -> `forge.env.d.ts` types.
4. **No over-engineering**: don't refactor unrelated code.

### Verify fix

```bash
# Run the specific test (should PASS now)
yarn test:unit:run -- -t "<test name>"

# Run all unit tests to ensure no regressions
yarn test:unit:run

# If the fix touches IPC channels, routes, or registrars, regenerate docs
yarn docs:generate
```

For final pre-merge validation, run the strict ordered quality gate in `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`.

## Checklist

```
[ ] Bug reproduced and understood
[ ] Root cause identified in code
[ ] Failing test written (exposes bug)
[ ] Test FAILS before fix
[ ] Minimal fix implemented
[ ] Test PASSES after fix
[ ] All existing tests still pass
[ ] Layer boundaries and IPC ordering respected (if applicable)
[ ] Living docs updated if githooks require it (docs/01_ARCHITECTURE.md, docs/02_CODEBASE_MAP.md, docs/03_IPC_CONTRACT.md)
```
