const fs = require('fs');
const path = require('path');
const {
  loadIpcCatalog,
  loadIpcConstants,
} = require('./contracts.cjs');

const CODEBASE_MAP_PATH = 'docs/02_CODEBASE_MAP.md';
const IPC_CONTRACT_PATH = 'docs/03_IPC_CONTRACT.md';

const SEAM_FILES = [
  'src/main.ts',
  'src/preload.ts',
  'src/database/db.ts',
  'src/renderer/App.tsx',
  'src/shared/ipcChannels.ts',
  'src/shared/ipcCatalog.ts',
  'src/shared/contracts/dbApi.ts',
  'forge.env.d.ts',
  'src/main/ipc/registerAbilityHandlers.ts',
  'src/main/ipc/registerActHandlers.ts',
  'src/main/ipc/registerArcHandlers.ts',
  'src/main/ipc/registerBattleMapHandlers.ts',
  'src/main/ipc/registerCampaignHandlers.ts',
  'src/main/ipc/registerLevelHandlers.ts',
  'src/main/ipc/registerSceneHandlers.ts',
  'src/main/ipc/registerSessionHandlers.ts',
  'src/main/ipc/registerStatBlockHandlers.ts',
  'src/main/ipc/registerTokenHandlers.ts',
  'src/main/ipc/registerVerseHandlers.ts',
  'src/main/ipc/registerWorldHandlers.ts',
];

function repoFile(repoRoot, relativePath) {
  return path.join(repoRoot, relativePath);
}

function readSource(repoRoot, relativePath) {
  return fs.readFileSync(repoFile(repoRoot, relativePath), 'utf8');
}

function parseRoleHeader(source) {
  const headerMatch = source.match(/\/\*\*[\s\S]*?\*\//);
  if (!headerMatch) {
    return null;
  }

  const readTag = (tag) => {
    const match = headerMatch[0].match(new RegExp(`@${tag}\\s+(.+)`));
    return match ? match[1].trim() : '';
  };

  const role = readTag('role');
  const owns = readTag('owns');
  const seam = readTag('seam');
  const calls = readTag('calls');

  if (!role || !owns || !seam || !calls) {
    return null;
  }

  return { role, owns, seam, calls };
}

function collectRoleMetadata(repoRoot) {
  return SEAM_FILES.map((relativePath) => ({
    path: relativePath,
    metadata: parseRoleHeader(readSource(repoRoot, relativePath)),
  }));
}

function parseAppImports(source) {
  const imports = new Map();
  const importRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+'([^']+)';/g;
  let match = importRegex.exec(source);
  while (match) {
    imports.set(match[1], match[2]);
    match = importRegex.exec(source);
  }
  return imports;
}

function parseRoutes(repoRoot) {
  const appPath = 'src/renderer/App.tsx';
  const source = readSource(repoRoot, appPath);
  const imports = parseAppImports(source);
  const routes = [];
  const routeRegex = /<Route\s+path='([^']+)'[\s\S]*?element={<([A-Za-z0-9_]+)\s*\/?>}[\s\S]*?\/>/g;
  let match = routeRegex.exec(source);
  while (match) {
    const component = match[2];
    routes.push({
      path: match[1],
      component,
      file: imports.get(component)?.replace('./', 'src/renderer/') + '.tsx',
    });
    match = routeRegex.exec(source);
  }
  return routes;
}

function padCell(value, width) {
  return value.padEnd(width, ' ');
}

function renderTable(headers, rows) {
  const widths = headers.map((header, columnIndex) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[columnIndex] ?? '').length),
    )
  );

  const renderRow = (row) =>
    `| ${row.map((cell, index) => padCell(String(cell ?? ''), widths[index])).join(' | ')} |`;
  const separatorRow = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`;

  return [renderRow(headers), separatorRow, ...rows.map(renderRow)].join('\n');
}

function buildCodebaseMapDoc(repoRoot = process.cwd()) {
  const roles = collectRoleMetadata(repoRoot)
    .filter((entry) => entry.metadata)
    .map((entry) => [
      `\`${entry.path}\``,
      entry.metadata.role,
      entry.metadata.owns,
      entry.metadata.seam,
      entry.metadata.calls,
    ]);

  const routes = parseRoutes(repoRoot).map((route) => [
    `\`${route.path}\``,
    `\`${route.component}\``,
    `\`${route.file}\``,
  ]);

  const catalog = loadIpcCatalog(repoRoot);
  const registrarSummary = Array.from(
    catalog.reduce((map, entry) => {
      const current = map.get(entry.handler) ?? {
        handler: entry.handler,
        domains: new Set(),
        count: 0,
      };
      current.domains.add(entry.domain);
      current.count += 1;
      map.set(entry.handler, current);
      return map;
    }, new Map()),
  )
    .map(([, entry]) => [
      `\`${entry.handler}\``,
      Array.from(entry.domains).sort().join(', '),
      String(entry.count),
    ]);

  return `# Codebase Map

This document is a current-state map for agents and maintainers. The tables below are generated from code-adjacent sources; update the source files and rerun \`yarn docs:generate\` instead of hand-editing generated rows.

## What Stays Human-Written

- Feature intent and user-visible behavior belong in \`docs/features/*.md\`.
- Architecture rationale belongs in \`docs/01_ARCHITECTURE.md\` and ADRs.
- This file stays short on purpose: use it to find the seam, not to narrate project history.

## Landmarks

<!-- BEGIN GENERATED LANDMARKS -->

${renderTable(['Path', 'Role', 'Owns', 'Seam', 'Calls'], roles)}

<!-- END GENERATED LANDMARKS -->

## Routes

<!-- BEGIN GENERATED ROUTES -->

${renderTable(['Route', 'Page', 'File'], routes)}

<!-- END GENERATED ROUTES -->

## IPC Registrars

<!-- BEGIN GENERATED REGISTRARS -->

${renderTable(['Handler', 'Domains', 'Channels'], registrarSummary)}

<!-- END GENERATED REGISTRARS -->
`;
}

function buildIpcContractDoc(repoRoot = process.cwd()) {
  const ipc = loadIpcConstants(repoRoot);
  const catalog = loadIpcCatalog(repoRoot);
  const summary = Array.from(
    catalog.reduce((map, entry) => {
      const current = map.get(entry.domain) ?? {
        domain: entry.domain,
        handlers: new Set(),
        count: 0,
      };
      current.handlers.add(entry.handler);
      current.count += 1;
      map.set(entry.domain, current);
      return map;
    }, new Map()),
  )
    .map(([, entry]) => [
      entry.domain,
      String(entry.count),
      Array.from(entry.handlers)
        .sort()
        .map((handler) => `\`${handler}\``)
        .join(', '),
    ]);

  const channelRows = catalog.map((entry) => [
    `\`IPC.${entry.key}\``,
    `\`${ipc[entry.key]}\``,
    `\`${entry.bridge}\``,
    `\`${entry.handler}\``,
    `\`${entry.typeSource}\``,
  ]);

  return `# IPC Contract

This document is a current-state contract index. It is generated from \`src/shared/ipcChannels.ts\`, \`src/shared/ipcCatalog.ts\`, and the shared \`DbApi\` contract. Do not hand-edit generated rows.

## Contract Rules

- Add or change a channel in \`src/shared/ipcChannels.ts\`.
- Update the matching entry in \`src/shared/ipcCatalog.ts\`.
- Keep \`src/preload.ts\` aligned with the shared \`DbApi\` contract.

## Domain Summary

<!-- BEGIN GENERATED IPC SUMMARY -->

${renderTable(['Domain', 'Channels', 'Handlers'], summary)}

<!-- END GENERATED IPC SUMMARY -->

## Channels

<!-- BEGIN GENERATED IPC TABLE -->

${renderTable(['Constant', 'String value', 'Bridge', 'Handler', 'Type source'], channelRows)}

<!-- END GENERATED IPC TABLE -->
`;
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (current === content) {
    return false;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function getGeneratedDocs(repoRoot = process.cwd()) {
  return [
    {
      path: repoFile(repoRoot, CODEBASE_MAP_PATH),
      relativePath: CODEBASE_MAP_PATH,
      content: buildCodebaseMapDoc(repoRoot),
    },
    {
      path: repoFile(repoRoot, IPC_CONTRACT_PATH),
      relativePath: IPC_CONTRACT_PATH,
      content: buildIpcContractDoc(repoRoot),
    },
  ];
}

module.exports = {
  CODEBASE_MAP_PATH,
  IPC_CONTRACT_PATH,
  SEAM_FILES,
  buildCodebaseMapDoc,
  buildIpcContractDoc,
  collectRoleMetadata,
  getGeneratedDocs,
  parseRoleHeader,
  parseRoutes,
  writeIfChanged,
};
