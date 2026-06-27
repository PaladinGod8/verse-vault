const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { loadTsModule } = require('./load-ts-module.cjs');

const IPC_CHANNELS_PATH = 'src/shared/ipcChannels.ts';
const IPC_CATALOG_PATH = 'src/shared/ipcCatalog.ts';
const DB_API_PATH = 'src/shared/contracts/dbApi.ts';
const PRELOAD_PATH = 'src/preload.ts';

function loadIpcConstants(repoRoot) {
  const modulePath = path.join(repoRoot, IPC_CHANNELS_PATH);
  return loadTsModule(modulePath).IPC;
}

function loadIpcCatalog(repoRoot) {
  const modulePath = path.join(repoRoot, IPC_CATALOG_PATH);
  return loadTsModule(modulePath).IPC_CATALOG;
}

function loadDbApiMethods(repoRoot) {
  const modulePath = path.join(repoRoot, DB_API_PATH);
  return loadTsModule(modulePath).DB_API_METHODS;
}

function bridgeToSegments(bridge) {
  if (!bridge.startsWith('window.db.')) {
    return [];
  }
  return bridge.slice('window.db.'.length).split('.');
}

function typeSourceToSegments(typeSource) {
  if (!typeSource.startsWith('DbApi.')) {
    return [];
  }
  return typeSource.slice('DbApi.'.length).split('.');
}

function validateCatalogCoverage(repoRoot = process.cwd()) {
  const ipc = loadIpcConstants(repoRoot);
  const catalog = loadIpcCatalog(repoRoot);
  const dbApiMethods = loadDbApiMethods(repoRoot);
  const seenKeys = new Set();
  const duplicateKeys = [];
  const invalidBridges = [];
  const invalidTypeSources = [];
  const missingHandlers = [];

  for (const entry of catalog) {
    if (seenKeys.has(entry.key)) {
      duplicateKeys.push(entry.key);
    }
    seenKeys.add(entry.key);

    const [domain, method] = bridgeToSegments(entry.bridge);
    const domainMethods = domain ? dbApiMethods[domain] : undefined;
    if (!domain || !method || !Array.isArray(domainMethods) || !domainMethods.includes(method)) {
      invalidBridges.push(entry);
    }

    const [typeDomain, typeMethod] = typeSourceToSegments(entry.typeSource);
    const typeMethods = typeDomain ? dbApiMethods[typeDomain] : undefined;
    if (
      !typeDomain
      || !typeMethod
      || !Array.isArray(typeMethods)
      || !typeMethods.includes(typeMethod)
    ) {
      invalidTypeSources.push(entry);
    }

    const handlerPath = path.join(repoRoot, entry.handler);
    if (!fs.existsSync(handlerPath)) {
      missingHandlers.push(entry);
    }
  }

  const ipcKeys = Object.keys(ipc);
  const catalogKeys = new Set(catalog.map((entry) => entry.key));
  const missingKeys = ipcKeys.filter((key) => !catalogKeys.has(key));
  const extraKeys = Array.from(catalogKeys).filter((key) => !(key in ipc));

  return {
    ipc,
    catalog,
    dbApiMethods,
    missingKeys,
    extraKeys,
    duplicateKeys,
    invalidBridges,
    invalidTypeSources,
    missingHandlers,
  };
}

function preloadUsesSharedDbApi(repoRoot = process.cwd()) {
  const preloadSource = fs.readFileSync(path.join(repoRoot, PRELOAD_PATH), 'utf8');
  return /const\s+\w+\s*:\s*DbApi\s*=\s*\{/.test(preloadSource);
}

function getPropertyName(node) {
  if (
    ts.isIdentifier(node)
    || ts.isStringLiteral(node)
    || ts.isNumericLiteral(node)
  ) {
    return node.text;
  }

  return null;
}

function collectObjectMethods(node, prefix = []) {
  if (!node || !ts.isObjectLiteralExpression(node)) {
    return [];
  }

  const methods = [];

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
      continue;
    }

    const propertyName = getPropertyName(property.name);
    if (!propertyName) {
      continue;
    }

    if (
      ts.isPropertyAssignment(property)
      && ts.isObjectLiteralExpression(property.initializer)
    ) {
      methods.push(...collectObjectMethods(property.initializer, [...prefix, propertyName]));
      continue;
    }

    methods.push([...prefix, propertyName].join('.'));
  }

  return methods;
}

function findDbApiInitializer(sourceFile) {
  let initializer = null;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'dbApi'
      && node.initializer
      && ts.isObjectLiteralExpression(node.initializer)
    ) {
      initializer = node.initializer;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return initializer;
}

function validatePreloadBridgeCoverage(repoRoot = process.cwd()) {
  const dbApiMethods = loadDbApiMethods(repoRoot);
  const preloadSource = fs.readFileSync(path.join(repoRoot, PRELOAD_PATH), 'utf8');
  const sourceFile = ts.createSourceFile(
    PRELOAD_PATH,
    preloadSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const dbApiInitializer = findDbApiInitializer(sourceFile);
  const preloadMethods = collectObjectMethods(dbApiInitializer);
  const expectedMethods = Object.entries(dbApiMethods).flatMap(([domain, methods]) =>
    methods.map((method) => `${domain}.${method}`)
  );
  const actualMethodSet = new Set(preloadMethods);
  const expectedMethodSet = new Set(expectedMethods);

  return {
    dbApiMethods,
    preloadMethods,
    missingMethods: expectedMethods.filter((method) => !actualMethodSet.has(method)),
    extraMethods: preloadMethods.filter((method) => !expectedMethodSet.has(method)),
  };
}

module.exports = {
  DB_API_PATH,
  IPC_CATALOG_PATH,
  IPC_CHANNELS_PATH,
  PRELOAD_PATH,
  bridgeToSegments,
  loadDbApiMethods,
  loadIpcCatalog,
  loadIpcConstants,
  preloadUsesSharedDbApi,
  validatePreloadBridgeCoverage,
  typeSourceToSegments,
  validateCatalogCoverage,
};
