# Agentic Final Testing Quality Gate

Use this as a copy-paste prompt when a feature branch is complete and needs a final quality pass by a coding agent (Claude Code, GitHub Copilot, ChatGPT Codex, etc.).

## Copy-Paste Prompt

```md
Run a final testing and quality-gate pass on the currently pushed feature changes.

Context and constraints:
- Follow repository rules in `AGENTS.md` and docs guardrails.
- Keep Electron security boundary intact (`contextIsolation: true`, `nodeIntegration: false`, no Node APIs in renderer).
- Use IPC constants from `src/shared/ipcChannels.ts`; no magic channel strings.
- Prefer fixing production code first when tests reveal behavior bugs.
- Only fix test code when the failing test itself is outdated/incorrect.
- Keep each fix small, safe, and reversible.

Required gate order (strict):
1. Lint/format gate
2. Unit test gate
3. Coverage gate (>= 80%)
4. E2E gate

Do not move to the next gate unless the current gate is green.
If you touch code at any gate, re-run all earlier gates before proceeding.

Detailed instructions:

## Gate 1: Lint and Format
- Run lint and format checks (repo standard commands).
- Fix all lint/format issues.
- Re-run until clean.

## Gate 2: Unit Tests
- Run unit tests.
- For failures:
  - Diagnose root cause.
  - If behavior is broken, fix production code first.
  - If test is wrong/stale, then fix test code.
- Re-run lint gate after code edits.
- Re-run unit tests until all pass.

## Gate 3: Coverage (Minimum 80%)
- Run coverage using the repository's unit test coverage command/mode.
- Enforce overall repository coverage >= 80%.
- Add focused tests where coverage is low, prioritizing:
  - newly added or changed feature code
  - critical behavior paths and edge cases
- Prefer unit tests unless a behavior is only validatable via e2e.
- After adding tests, re-run lint + unit + coverage until all pass and coverage is >= 80%.

## Gate 4: E2E Tests
- Run e2e tests in a reliable sequence.
- Segment/serialize tests that share resources/state to avoid cross-test interference.
- For failures:
  - Fix production code first if behavior is actually broken.
  - Fix e2e test code only when test assumptions/selectors/flow are outdated.
- Re-run gates 1-3 when code/test edits are made, then re-run e2e.
- Repeat until all e2e tests pass.

Execution behavior:
- Be explicit about each command you run.
- Stop hiding failures: surface failing files/tests and root cause.
- Make minimal diffs and keep architecture boundaries intact.
- Update hook-required living docs in the same commit step when touched files require it.

Output format (required):
1. Gate status summary:
   - Gate 1 Lint/Format: PASS/FAIL
   - Gate 2 Unit: PASS/FAIL
   - Gate 3 Coverage: PASS/FAIL with percentage
   - Gate 4 E2E: PASS/FAIL
2. Files changed (production vs tests vs docs).
3. Why each change was needed (root-cause based).
4. Coverage additions:
   - New/updated test files
   - Behaviors covered
   - Remaining coverage gaps (if any)
5. Final quality result:
   - all gates green or exact blocker.
6. Suggested final commit message for this gate step using one prefix: `fix:`, `test:`, `chore:`, or `docs:`.
```

## Use During Prompt-Splitting Workflows

When creating sequential prompts under `docs/prompts/`, include a late-stage step named `Final Quality Gate` that references this file.

Recommended wording inside that step:

```md
Run the final gate in `docs/06_AGENTIC_TESTING_QUALITY_GATE.md` and do not mark this step done until all four gates are green in order.
```

## Notes

- This file defines the cross-agent quality gate behavior.
- Feature-level documentation still belongs in `docs/features/<feature-slug>.md` as the final docs step.