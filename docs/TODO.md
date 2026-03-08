# TODO

## Product Direction

Build Verse Vault as a centralized, offline-first Electron platform for:

- TTRPG campaign management
- Creative writing
- Worldbuilding

Core workflows must function fully offline with local-first persistence.

## Immediate TODO

- [ ] Create CRUD foundations for campaign, worldbuilding, and manuscript domains
- [ ] Replace the temporary `verses` scaffold with domain-driven entities
- [ ] Define base schema and IPC contracts for:
  - campaigns
  - parties
  - players
  - player characters
  - worlds
  - lore entries
  - manuscripts
  - sessions
- [ ] Build universal search across local content
- [ ] Add local backup/export/import flow

## Campaign Management

- [ ] TODO list (item view)
- [ ] TODO list (kanban view)
- [ ] Dashboard for recently viewed cards
- [ ] Party management dashboard
- [ ] Player CRUD
- [ ] Player character CRUD
- [ ] Party CRUD
- [ ] Player, PC, and campaign linking
- [ ] Campaign CRUD
- [ ] Campaign status tracking (active, defunct, archived)
- [ ] GM screen
- [ ] Scratch notes CRUD
- [ ] Session preparation
- [ ] Session journals and logs
- [ ] Offline and outstanding business tracking
- [ ] Backup PCs
- [ ] The Party dashboard
- [ ] Achievements, memories, and moments
- [ ] Linking system

## Worldbuilding

- [ ] World CRUD
- [ ] Levels (race, major class, etc.)
- [ ] Abilities
- [ ] Items
- [ ] Characters
- [ ] Identities
- [ ] Factions
- [ ] Locations
- [ ] Stat blocks
- [ ] Battle maps
- [ ] Entry clone/instances model (ECS)
- [ ] Level progressions
- [ ] Level rosters
- [ ] Plot lines (integrated with manuscript)
- [ ] Plot webs (graph visualization)
- [ ] Content trees (family tree, linked kith)
- [ ] Personal kith single-view

## Setting Enchiridion

- [ ] World maps (pinpoints, GIS, layered maps)
- [ ] Cosmology and dimension maps
- [ ] Timeline trees (chronicles)
- [ ] Timelines and branches
- [ ] Historical events
- [ ] Calendar systems
- [ ] Languages
- [ ] Economics
- [ ] Secrets with article-level visibility controls
- [ ] Lore entries with template metadata
- [ ] Lore tags (preset + custom)
- [ ] Tag categories: arts and entertainment
- [ ] Tag categories: anomalies
- [ ] Tag categories: biology, flora, and fauna
- [ ] Tag categories: crime and underworld
- [ ] Tag categories: cuisine
- [ ] Tag categories: cultures and societies
- [ ] Tag categories: cyberspace and virtualization
- [ ] Tag categories: conveniences and luxuries
- [ ] Tag categories: dangers
- [ ] Tag categories: dimensions
- [ ] Tag categories: districts and cityscape
- [ ] Tag categories: geography, terrain, and environment
- [ ] Tag categories: laws of the universe
- [ ] Tag categories: military and conflicts
- [ ] Tag categories: myths and legends
- [ ] Tag categories: politics
- [ ] Tag categories: reality warping
- [ ] Tag categories: religions, beliefs, and the divine
- [ ] Tag categories: technology and science
- [ ] Tag categories: wellsprings of power (magic, space magic)
- [ ] Tag categories: time dilation
- [ ] Tag categories: travel and transport

## Manuscript and Writing

- [ ] Manuscript CRUD
- [ ] Preamble plot
- [ ] Setting almanac
- [ ] Plot fronts
- [ ] Chapter files
- [ ] Story arcs
- [ ] Plot slices (character development, POV, conflicts, intertwined narratives)
- [ ] Plot hooks (active, missed, recoursed)
- [ ] Scripted assets (scenes, battle maps, shops)
- [ ] Flexible vault assets (music, scenes, encounters, shops, stat blocks, lore notes)
- [ ] Research assets
- [ ] Volume organization and collections

## GM Tooling

- [ ] Zettelkasten system on all GM-created assets
- [ ] Versioning on all GM-created assets
- [ ] Asset rollback via versioning
- [ ] Character creator
- [ ] Auto-roller
- [ ] System creator
- [ ] Combat simulator
- [ ] Visual novel engine

## Build & Performance Optimization

### Build Tooling - SWC + esbuild Coexistence

**Current State:**

- Vite 6 with esbuild (default) for TypeScript transpilation
- No React plugin configured
- Missing React Fast Refresh in development

**Opportunity:**

- [ ] Add `@vitejs/plugin-react-swc` for React-specific optimizations
  - Both tools coexist: esbuild handles TS transpilation, SWC handles React transformations
  - SWC provides: JSX transformation, React Fast Refresh, React-specific optimizations
  - esbuild provides: Fast TS compilation, dependency pre-bundling
  - Implementation locations: `vite.renderer.config.ts`, `vitest.config.ts`
  - Package to install: `@vitejs/plugin-react-swc`

**Division of Labor:**

- esbuild: TypeScript → JavaScript, dependency bundling, non-React transforms
- SWC: JSX → JavaScript, React Fast Refresh, React-specific optimizations

### Formatter Performance

- [x] Standardize formatter on dprint for local + CI workflows
  - Current: `yarn format:check` and `yarn format`
  - Files: `dprint.json`, `package.json` scripts
  - Follow-up: monitor formatting step duration in CI as codebase grows

### CI Caching Strategy

- [ ] Design and implement CI caching for pipeline steps
  - Identify cacheable artifacts: node_modules, Electron packages, build outputs, Playwright browsers
  - Define cache keys: package.json hash, yarn.lock checksum
  - Implement cache invalidation rules to prevent stale/corrupted states
  - Add per-step cache isolation strategy
  - Consider cache cleanup/eviction policy for long-lived branches

## Business Tooling (Later)

- [ ] CRM
- [ ] CRM contacts (affiliates, sponsors, collaborations)
- [ ] CRM opportunities
- [ ] HR and outward-facing operations
- [ ] In-house records (players, GMs, admins, community members)
- [ ] Events and marketing campaign timeline
- [ ] Event planner (logistics, finances)
- [ ] Workforce management (HR)
- [ ] Social media outreach and recruitment
- [ ] Assets and liabilities
- [ ] Finances
- [ ] Global distribution and language translation
- [ ] Funding
- [ ] Inspirations and market validation
- [ ] Intellectual property and licensing rights
- [ ] Milestones and metrics
- [ ] Activity analytics (community and web traffic)
- [ ] Gantt, timeline, and project manager
- [ ] Proof of concepts
- [ ] Investor view (business plan, success stories)

## Infrastructure & CI/CD

### Docker Containerization

High-value use cases for Docker in this project:

**Phase 1: Local Development & Quality Gate**

- [ ] Create Dockerfile for verify-all.cjs pipeline execution
- [ ] Base image with Node 20, Electron build deps, Playwright, better-sqlite3 system requirements
- [ ] Multi-stage build with dependency layer caching (node_modules)
- [ ] Volume mount strategy for test artifacts isolation (coverage/, test-results/, playwright-report/)
- [ ] Document Docker-based local verification workflow

**Phase 2: CI/CD Pipeline**

- [x] Set up GitHub Actions workflow with CI paper trail (`.github/workflows/ci.yml`)
- [x] Parallel job execution where safe (`fast-checks` matrix + `package`, with `e2e` sequenced after `package`)
- [x] Implement baseline caching strategy (`actions/setup-node` yarn cache + `actions/cache` for `.vite` and ESLint cache)
- [ ] Evaluate Dockerized CI path for stricter environment parity with local scripts
- [ ] Evaluate Playwright browser cache policy for self-hosted runner stability
- [ ] Continue tuning better-sqlite3 rebuild reliability on self-hosted Windows runner

**Phase 3: Cross-Platform Packaging**

- [ ] Separate Dockerfiles for Linux package builds (.deb, .rpm makers)
- [ ] Enable building Linux packages from Windows/macOS without dual-boot
- [ ] Consistent asar unpacking for better-sqlite3 across platforms
- [ ] Build matrix for multi-platform Electron Forge packaging

**Phase 4: E2E Test Isolation (Optional Enhancement)**

- [ ] Container-based Playwright test runners with Xvfb for headless Electron
- [ ] Complete process isolation per test (separate SQLite DBs per container)
- [ ] Parallel worker scaling beyond current 2-worker limit

**Caching Strategy for CI Pipeline Speed**

Priority caching opportunities based on verify-all.cjs analysis:

**High-Impact Caches (30-60s savings)**

- [ ] Yarn dependencies: Cache node_modules/ + yarn cache directory
  - Key: yarn-{{ platform }}-{{ hash(yarn.lock, package.json) }}
  - Restore keys: yarn-{{ platform }}- (fallback to recent cache)
  - Size: ~300MB+
  - Invalidation: on yarn.lock or package.json change

**Medium-Impact Caches (10-30s savings)**

- [ ] TypeScript build cache: .tsbuildinfo files + dist/ outputs
  - Key: ts-{{ hash(**/_.ts, **/_.tsx, tsconfig*.json) }}
  - No fallback (stale cache could cause type errors)
  - Invalidation: on any source or config change

- [ ] Electron package build: .vite/build/ outputs
  - Key: build-{{ hash(src/**, vite*.config.ts, forge.config.ts) }}
  - No fallback (stale builds are dangerous)
  - Invalidation: on source or config change

- [ ] Better-SQLite3 native modules: node_modules/better-sqlite3/build/
  - Key: native-{{ os }}-{{ arch }}-electron-35-{{ hash(yarn.lock) }}
  - Must match exact platform/Electron version
  - Invalidation: on Electron version or platform change

**Low-Medium Impact Caches (5-15s savings)**

- [ ] ESLint cache: .eslintcache file
  - Enable with: eslint --cache --ext .ts,.tsx .
  - Key: eslint-{{ hash(**/_.ts, **/_.tsx, .eslintrc*) }}
  - Restore keys: eslint- (partial matches still save time)
  - Invalidation: on linted files or config change

- [ ] dprint optimization strategy
  - Current command: `yarn format:check` (dprint)
  - Evaluate whether changed-file scoped formatting checks are needed for CI speed
  - If added, document cache/scope behavior in `docs/features/github-actions-setup.md`

**One-time Setup Caches (60+ seconds first run)**

- [ ] Playwright browsers: ~/.cache/ms-playwright/ (Linux/Mac) or %USERPROFILE%\AppData\Local\ms-playwright\ (Windows)
  - Key: playwright-{{ playwright-version }}
  - Invalidation: on Playwright version update
  - Size: ~500MB (Chromium, Firefox, WebKit)

**Cache Management to Prevent Corruption/Staleness**

- [ ] Add cache validation functions in verify-all.cjs
- [ ] Implement lock files to prevent concurrent cache writes
- [ ] Set max cache age (e.g., 7 days) with timestamp in cache keys
- [ ] Use cache version prefixes (v1-, v2-) to invalidate all caches when format changes
- [ ] Store caches in isolated namespaces per CI job to prevent conflicts
- [ ] Clean temp/build directories before restoring caches
- [ ] Add cache hit/miss logging for debugging

**Expected Performance Improvements**

- First run (cold cache): ~5-8 minutes (current baseline)
- Subsequent runs (warm cache, no changes): ~1-2 minutes (75% faster)
- Partial changes (warm cache): ~2-4 minutes (40-60% faster)

**Implementation Scripts**

- [x] Update package.json to enable ESLint cache flags (`lint:cache`)
- [ ] Add cache:clean script: clear local tool/test caches (`node_modules/.cache`, `.vite`, `coverage`, `playwright-report`, `test-results`)
- [ ] Create cache validation utilities for verify-all.cjs
- [x] Document cache key patterns in `.github/workflows/ci.yml` and `docs/features/github-actions-setup.md`

**Notes:**

- Docker not recommended for `yarn dev` (Electron needs native display/GPU access, hot reload suffers)
- Current E2E isolation with `--user-data-dir` is adequate; Docker E2E is optional
- Dockerfile location: `Dockerfile` (root) or `.docker/` directory for multi-stage configs

### Build & Pipeline Optimization

**Formatter Performance**

- [x] Adopt dprint as formatter for local and CI checks
- [ ] Benchmark `yarn format:check` timing in `verify:rapid`, `verify:all`, and CI matrix jobs
- [ ] If formatting time regresses, evaluate parallelized formatter checks by changed-files scope

**Compiler & Bundler Optimization**

- [ ] Investigate if SWC (Speedy Web Compiler) can replace/augment current build pipeline
- [ ] Document current use of esbuild in Vite/Electron Forge stack
- [ ] Evaluate TypeScript compilation speed with SWC vs current tsc type-check
- [ ] Consider esbuild-based type checking alternatives

**Test Suite Parallelism** (already optimized per docs/features/optimization.md)

- [x] Unit tests: forks pool with maxWorkers:(cpus-1, minimum 2)
- [x] E2E tests: 2 Playwright workers with --user-data-dir isolation
- [ ] Audit if additional test grouping/segmentation would improve parallel execution
- [ ] Consider splitting long-running test files for better load distribution

## Third-Party Tools and Security

- [ ] Evaluate Azgaar's Fantasy Maps integration
- [ ] Add Electronegativity to local pipeline
- [ ] Add Semgrep to local pipeline
- [ ] Add ESLint security plugins to local pipeline
- [ ] Add gitleaks to local pipeline
- [ ] Add Trivy to local pipeline
