# Build & Release

## Release Principles

- Verse Vault is desktop-first and offline-first.
- Core campaign/worldbuilding/writing workflows must run without network access.
- User data persists locally in app `userData` via SQLite.

## Dev Mode

```bash
yarn start   # or: yarn dev
# Vite compiles main + preload, starts Electron with hot reload.
# DevTools open automatically.
```

## Packaging & Distribution

```bash
yarn package   # package only (no installer) -> out/
yarn make      # package + build platform-specific installers -> out/make/
```

### Makers (configured in `forge.config.ts`)

| Platform | Maker         | Output           |
| -------- | ------------- | ---------------- |
| Windows  | MakerSquirrel | `.exe` installer |
| macOS    | MakerZIP      | `.zip` archive   |
| Linux    | MakerRpm      | `.rpm` package   |
| Linux    | MakerDeb      | `.deb` package   |

## Native Module Rebuild

```bash
yarn rebuild   # electron-rebuild -f -w better-sqlite3
# Runs automatically via postinstall after every yarn install.
```

- Rebuild is required when switching Electron versions.
- `rebuildConfig.onlyModules: ['better-sqlite3']` in `forge.config.ts` scopes rebuilds to that module.

## Config File Map

| File                      | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `forge.config.ts`         | Makers, plugins, asar settings, rebuildConfig                    |
| `vite.main.config.ts`     | Main process build (CJS output, externals)                       |
| `vite.preload.config.ts`  | Preload build (single bundle, inline dynamic imports)            |
| `vite.renderer.config.ts` | Renderer build (Tailwind, dev server exposure)                   |
| `vite.base.config.ts`     | Shared config: `external` const, define keys, hot-restart plugin |

**Output directories**: `.vite/` (build cache/artifacts), `out/` (packaged app)

## CI Lint Strategy

CI uses event-aware lint execution to balance PR velocity with merge safety:

- `pull_request` runs `yarn lint:changed` to lint only changed tracked `.ts/.tsx` files in the PR diff context.
- `push` and `workflow_dispatch` run `yarn lint` to enforce a full strict repository lint gate before/at merge.

This keeps PR feedback loops fast while retaining a strong full-lint safety net on branch integration paths.

### ESLint Cache in CI

- ESLint cache location: `node_modules/.cache/eslint/.eslintcache`
- `yarn lint` and `yarn lint:changed` both use the same cache location.
- `.github/workflows/ci.yml` restores/saves `node_modules/.cache/eslint` via `actions/cache`.

Caching ESLint metadata reduces repeat lint cost across CI jobs and reruns without weakening strictness (`--max-warnings=0` remains enforced).

## CI E2E Sharding

E2E tests run as a 5-shard matrix in CI to distribute Playwright tests across all 5
available `ci`-labeled runners.

### How sharding works

- Each shard receives a subset of test files via `--shard=N/5`.
- Playwright distributes test files evenly across shards automatically.
- All shards run with `PLAYWRIGHT_WORKERS: 2` (conservative; raise after confirming stability).
- A per-shard report artifact (`playwright-report-shard-N`) is uploaded for triage.

### Runner labels

| Label     | Purpose                                                                |
| --------- | ---------------------------------------------------------------------- |
| `ci`      | Required on all CI runners — minimum 5 for full parallelism            |
| `package` | Required on the runner dedicated to `yarn package` (also carries `ci`) |

> After `bootstrap`, 5 jobs run simultaneously: 4 fast-checks matrix items + 1 package job.
> Five `ci`-labeled runners (one also carrying `package`) are required to avoid queueing.

### Tuning guidance

- `fail-fast: false` keeps all shards running even if one fails.
- The `e2e` job gates on both `fast-checks` and `package` — E2E only runs when the build
  is clean and the package artifact exists.
- To change shard count: update `matrix.shard` array and the `/total` in the run command
  atomically.
- If shards are flaky, reduce `PLAYWRIGHT_WORKERS` first; only reduce shard count if the
  distribution itself is the problem.
- Test isolation is enforced by `launchApp()` per test with a unique temp `userDataDir`.
  Never share paths or database files across tests or shards.

## Common Gotchas

- **`better-sqlite3` must be rebuilt** after `yarn install` or Electron version bumps. `postinstall` handles this automatically, but Electron must not be running (Windows EPERM).
- **All `@electron-forge/*` packages must match versions.** Mismatches can cause misleading startup/plugin errors.
- **`node-abi` is pinned** in `package.json` `resolutions` to `3.87.0` for Electron 35 ABI support.
- **Fuses are compile-time.** Security fuses (`FusesPlugin` in `forge.config.ts`) are baked at `yarn make`, not `yarn start`.
- **asar native unpacking matters.** `.node` and `.dylib` files are unpacked via `asar.unpack`/`asar.unpackDir`; removing this breaks native modules in production.
- **Offline-first validation is required.** Before release, verify startup and core CRUD while disconnected from network.
