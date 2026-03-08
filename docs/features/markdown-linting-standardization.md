# Markdown Linting Standardization

## Goal

Standardize Markdown quality checks for all tracked `.md` files while keeping lint runs partitionable for agent workflows.

## Tooling

- Formatting: `dprint` (`yarn format`, `yarn format:check`)
- Markdown structure lint: `markdownlint-cli2` (configured by `.markdownlint-cli2.jsonc`)
- Prose/policy lint: `Vale` (configured by `.vale.ini` and `.vale/styles/VerseVault/`)

## Tracked-File Policy

Markdown linting runs target tracked files from Git (`git ls-files -- '*.md'`).
Untracked drafts are intentionally excluded from standard lint gates.

## Partition Contract

Partition keys are managed by `scripts/lint-tracked-markdown.cjs`:

- `all`
- `root`
- `docs`
- `core`
- `features`
- `logs`
- `prompts`
- `adr`
- `vsnotes`

## Standard Commands

- `yarn lint:docs` - lint all tracked Markdown with markdownlint + Vale
- `yarn lint:docs:staged` - lint tracked staged Markdown only
- `yarn lint:docs:changed` - lint tracked PR-diff Markdown only
- `yarn lint:docs:list-partitions` - list partition keys and meanings

Partition-specific commands:

- `yarn lint:md:core` / `yarn lint:vale:core`
- `yarn lint:md:features` / `yarn lint:vale:features`
- `yarn lint:md:logs` / `yarn lint:vale:logs`
- `yarn lint:md:prompts` / `yarn lint:vale:prompts`

## Agent Guidance

When making localized doc changes, run only relevant partitions first, then run `yarn lint:docs` before finalizing.

Recommended sequence:

1. Partitioned lint for touched scope (`core`, `features`, `logs`, or `prompts`)
2. `yarn lint:docs`
3. `yarn lint` (full code + docs gate)

## Notes

- Vale must be available on PATH for Vale scripts to run.
- `markdownlint-cli2` is installed as a repository dev dependency.
