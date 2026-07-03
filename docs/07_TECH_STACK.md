# Tech Stack

Manual inventory of technologies, tooling, and libraries used in this repo.

Purpose:

- Give humans and agents one place to see major repo dependencies.
- Track intentional technology additions over time.
- Stay hand-maintained. Do not generate this file from `package.json`.

Update rule:

- Update this file only when a change introduces a new technology, library, framework, platform dependency, build tool, test tool, lint/doc tool, or external developer tool to repo workflow.
- Do not update this file for routine version bumps, refactors, removals, or feature work that uses existing stack only.
- When in doubt, update if new thing changes how repo is built, tested, run, packaged, linted, scanned, or architected.

## Runtime Application Stack

| Technology      | Role in repo                                                                    |
| --------------- | ------------------------------------------------------------------------------- |
| Electron 35     | Desktop shell and main/preload process runtime                                  |
| React 19        | Renderer UI framework                                                           |
| React Router 7  | Renderer route management                                                       |
| TypeScript 5    | Primary language across app and scripts                                         |
| Vite 6          | Renderer and Electron build integration via Forge plugin                        |
| better-sqlite3  | Main-process SQLite driver                                                      |
| Zustand 5       | Renderer client-state management                                                |
| Tailwind CSS v4 | Utility-first styling                                                           |
| DaisyUI 5       | Theme/component utility layer on top of Tailwind                                |
| PixiJS 8        | Battlemap rendering and graphics runtime                                        |
| phonemize       | English-to-IPA phonemization in the renderer IPA tool                           |
| Excalidraw      | Infinite-canvas whiteboard editor for campaign/lore note canvases               |
| Azgaar FMG      | Vendored offline world-map editor (`vendor/azgaar-fmg/`), pinned upstream build |

## Packaging And Desktop Build

| Technology                | Role in repo                                        |
| ------------------------- | --------------------------------------------------- |
| Electron Forge            | App start, package, make, and publish workflow      |
| electron-rebuild          | Native module rebuild after install/version changes |
| electron-squirrel-startup | Windows installer startup handling                  |
| @electron/fuses           | Electron hardening/fuse config                      |

## Testing

| Technology      | Role in repo                       |
| --------------- | ---------------------------------- |
| Vitest          | Unit test runner                   |
| Testing Library | Renderer behavior tests in jsdom   |
| jsdom           | Browser-like unit test environment |
| Playwright      | End-to-end desktop verification    |

## Code Quality And Docs Quality

| Technology        | Role in repo                                                |
| ----------------- | ----------------------------------------------------------- |
| ESLint            | TypeScript/YAML/code linting                                |
| dprint            | Formatting and format checks                                |
| markdownlint-cli2 | Markdown linting                                            |
| Vale              | Prose/docs linting                                          |
| gitleaks          | Secret scanning in local verify lanes and CI-aligned checks |

## Build, CI, And Repo Automation

| Technology     | Role in repo                              |
| -------------- | ----------------------------------------- |
| GitHub Actions | CI automation                             |
| Node.js 20 LTS | Expected local and CI runtime for tooling |
| Yarn 1.22      | Package manager and script runner         |

## Notes For Agents

- If your change adds a new technology, update this file in same change.
- Examples that should update this file: adding `gitleaks`, Playwright, new UI framework, new DB, new package manager, new docs/lint tool, new release/distribution tool.
- Examples that should not update this file: adding feature code with existing React/Electron stack, bumping Electron 35.0.3 to newer 35.x, changing internal scripts without new external tooling.
