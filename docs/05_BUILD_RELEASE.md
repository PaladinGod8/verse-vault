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

## Common Gotchas

- **`better-sqlite3` must be rebuilt** after `yarn install` or Electron version bumps. `postinstall` handles this automatically, but Electron must not be running (Windows EPERM).
- **All `@electron-forge/*` packages must match versions.** Mismatches can cause misleading startup/plugin errors.
- **`node-abi` is pinned** in `package.json` `resolutions` to `3.87.0` for Electron 35 ABI support.
- **Fuses are compile-time.** Security fuses (`FusesPlugin` in `forge.config.ts`) are baked at `yarn make`, not `yarn start`.
- **asar native unpacking matters.** `.node` and `.dylib` files are unpacked via `asar.unpack`/`asar.unpackDir`; removing this breaks native modules in production.
- **Offline-first validation is required.** Before release, verify startup and core CRUD while disconnected from network.
