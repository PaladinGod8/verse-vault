# verse-vault-tdd

Test-driven development for Verse Vault. Use when building features or fixing bugs test-first, or when red-green-refactor / unit/E2E tests are needed for this repo.

Treat the repo-root `AGENTS.md` as the canonical process contract for Verse Vault. This skill is the Codex entrypoint for the repo's TDD workflow; if this skill and `AGENTS.md` disagree, `AGENTS.md` wins.

This is the Codex mirror of `.claude/skills/tdd/SKILL.md`. Same philosophy and conventions, packaged for `$CODEX_HOME/skills/verse-vault-tdd` (default `~/.codex/skills/verse-vault-tdd`). Keep both files in sync when either changes.

## Philosophy

Tests verify behavior through public interfaces, not implementation details. Good tests are integration-style: they exercise real code paths and read like a spec ("user can add a verse"). They survive refactors because they don't care about internal structure.

**Do not write all tests first, then all implementation** (horizontal slicing) — that produces tests for _imagined_ behavior. Work in vertical slices: one test, then the minimal code to pass it, repeat.

```
RIGHT (vertical):
  RED->GREEN: test1->impl1
  RED->GREEN: test2->impl2
  ...
```

Never refactor while RED. Get to GREEN first, then refactor.

## Workflow

1. **Plan**: confirm which behaviors matter most (you can't test everything) and what interface change is needed. If IPC is involved, update in order: `src/shared/ipcChannels.ts` -> `src/main.ts` handlers -> `src/preload.ts` bridge -> `forge.env.d.ts` types.
2. **Tracer bullet**: write one test for the first behavior, watch it fail, write minimal code to pass it.
3. **Incremental loop**: for each remaining behavior, repeat RED -> GREEN. Only enough code to pass the current test; don't anticipate future tests.
4. **Refactor**: once all targeted behaviors are GREEN, extract duplication and deepen modules. Re-run tests after each refactor step.

## Verse Vault test conventions

- Unit tests -> `tests/unit/<FeatureName>.test.tsx` (Vitest + `@testing-library/react`, jsdom).
- E2E tests -> `tests/e2e/<FeatureName>.test.ts` (Playwright; requires a built app via `yarn package`).
- Never create test helper files, fixtures folders, or new config files unless explicitly asked.
- Mock `window.db` (the IPC bridge) for unit tests — never import main-process code in unit tests.
- Follow the patterns in `tests/unit/App.test.tsx` and `tests/e2e/app.test.ts` exactly.
- Decide scope per behavior: pure UI/component change -> unit test only; IPC handler change -> unit test mocking `window.db` (E2E covers the real path); full feature (UI + IPC + DB) -> both.
- Run `yarn test:unit:run` before finishing; fix failing tests, never leave them failing.
- For the full pre-merge gate (lint, coverage, E2E), see `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`.

### `window.db` mock pattern (unit tests)

```ts
vi.stubGlobal('db', {
  verses: {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({
      id: 1,
      text: 'test',
      reference: null,
      tags: null,
      created_at: '',
      updated_at: '',
    }),
    update: vi.fn().mockResolvedValue({
      id: 1,
      text: 'updated',
      reference: null,
      tags: null,
      created_at: '',
      updated_at: '',
    }),
    delete: vi.fn().mockResolvedValue({ id: 1 }),
  },
});
```

### Async and race-condition rules

Unit tests:

- `await` every async mock call and every async user interaction.
- Use `findBy*` queries (not `getBy*`) for elements that appear after an async operation.
- Put `vi.clearAllMocks()` and `window.db` re-assignment in `beforeEach`, not at module level.
- Call `userEvent.setup()` inside each test or in `beforeEach` — never share an instance across tests.
- Never use `setTimeout`, `sleep`, or fixed delays — use async queries or mock resolution.
- A hanging or timing-sensitive test is a bug; fix the async handling, not the timeout.

E2E tests:

- Call `launchApp()` per test, not per `describe` block — each test gets its own isolated temp database.
- Wrap the test body in `try/finally` and call `closeApp(app, userDataDir)` in `finally`.
- Use `waitForFunction`, `waitForSelector`, or `expect(locator).toBeVisible()` — never `page.waitForTimeout`.
- After `launchApp()`, wait for a stable UI element before asserting.
- No shared state (files, DB paths, process handles) between tests or workers.

## Checklist per cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only (window.db, rendered UI)
[ ] Test would survive an internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

## When finishing

Return one final commit message suggestion: `feat:` for feature behavior, `test:` for test-only changes, `fix:` for refactors/fixes.
