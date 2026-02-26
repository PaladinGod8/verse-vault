# ADR-0001: Centralize IPC Channel Names in a Shared Constants File

**Date**: 2026-02-26
**Status**: Accepted

## Context

IPC channel strings (`'db:verses:getAll'`, etc.) were duplicated as magic strings in both `src/main.ts` (handler registration) and `src/preload.ts` (invoke calls). A typo in either file would cause silent runtime failures with no TypeScript error.

## Decision

Created `src/shared/ipcChannels.ts` exporting a single `IPC` constant object (`as const`) imported by both `main.ts` and `preload.ts`. Both files now reference `IPC.VERSES_GET_ALL` etc. instead of raw strings.

## Consequences

- **Good**: Single source of truth — renaming a channel is a one-file change; typos become compile errors.
- **Good**: New channels are added in one place, keeping `docs/03_IPC_CONTRACT.md` easy to keep in sync.
- **Trade-off**: Both main and preload processes now share a file; `src/shared/` is a convention that must be maintained (keep it free of process-specific imports).

## Alternatives Considered

- **Keep magic strings**: Simple but error-prone; would become worse as the channel count grows.
- **Generate from TS interfaces**: Over-engineered for the current scale.
