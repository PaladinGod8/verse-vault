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

## Third-Party Tools and Security

- [ ] Evaluate Azgaar's Fantasy Maps integration
- [ ] Add Electronegativity to local pipeline
- [ ] Add Semgrep to local pipeline
- [ ] Add ESLint security plugins to local pipeline
- [ ] Add gitleaks to local pipeline
- [ ] Add Trivy to local pipeline
