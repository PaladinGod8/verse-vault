#!/usr/bin/env node

// Shared package-artifact reuse: hashes the inputs that feed `yarn package`
// (source + vite/forge configs + manifests) so callers can skip re-packaging
// when nothing relevant changed. Used by both scripts/verify-smart.cjs and
// scripts/verify-all.cjs so a package run by either one lets the other reuse
// its output.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_CACHE_DIR = path.resolve('.cache', 'package-fingerprint');
const DEFAULT_CACHE_FILE = path.join(DEFAULT_CACHE_DIR, 'state.json');
const DEFAULT_PACKAGE_MAIN_ENTRY = path.resolve('.vite', 'build', 'main.js');

const DEFAULT_FINGERPRINT_INPUTS = [
  'src',
  'forge.config.ts',
  'forge.ignore.ts',
  'vite.base.config.ts',
  'vite.main.config.ts',
  'vite.preload.config.ts',
  'vite.renderer.config.ts',
  'tsconfig.json',
  'forge.env.d.ts',
  'package.json',
  'yarn.lock',
];

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function walkFiles(rootPath, output = []) {
  const absoluteRoot = path.resolve(rootPath);
  if (!fs.existsSync(absoluteRoot)) {
    return output;
  }

  const stat = fs.statSync(absoluteRoot);
  if (stat.isFile()) {
    output.push(normalizePath(path.relative(process.cwd(), absoluteRoot)));
    return output;
  }

  const entries = fs.readdirSync(absoluteRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }
    const nextPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      walkFiles(nextPath, output);
    } else if (entry.isFile()) {
      output.push(normalizePath(path.relative(process.cwd(), nextPath)));
    }
  }

  return output;
}

function getPackageFingerprint(inputs = DEFAULT_FINGERPRINT_INPUTS) {
  const files = inputs.flatMap((inputPath) => walkFiles(inputPath));
  const uniqueFiles = [...new Set(files)].sort((left, right) => left.localeCompare(right));
  const hash = crypto.createHash('sha256');

  for (const filePath of uniqueFiles) {
    const absolute = path.resolve(filePath);
    hash.update(filePath);
    hash.update(':');
    hash.update(hashFile(absolute));
    hash.update('\n');
  }

  return hash.digest('hex');
}

function loadCacheState(cacheFile = DEFAULT_CACHE_FILE) {
  try {
    if (!fs.existsSync(cacheFile)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveCacheState(state, cacheFile = DEFAULT_CACHE_FILE) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Returns whether the existing packaged app output can be reused: the
 * fingerprint of packaging inputs matches the last recorded packaging run
 * and the packaged entry point still exists on disk.
 */
function canReusePackagedApp({
  inputs = DEFAULT_FINGERPRINT_INPUTS,
  cacheFile = DEFAULT_CACHE_FILE,
  packageMainEntry = DEFAULT_PACKAGE_MAIN_ENTRY,
} = {}) {
  const fingerprint = getPackageFingerprint(inputs);
  const cacheState = loadCacheState(cacheFile);
  const cachedFingerprint = cacheState.package?.fingerprint;
  const canReuse = cachedFingerprint === fingerprint && fs.existsSync(packageMainEntry);

  return { canReuse, fingerprint, cacheState };
}

/** Records that a package run completed for the given fingerprint. */
function recordPackaged({ fingerprint, cacheState = {}, cacheFile = DEFAULT_CACHE_FILE }) {
  saveCacheState(
    {
      ...cacheState,
      package: {
        fingerprint,
        timestamp: new Date().toISOString(),
      },
    },
    cacheFile,
  );
}

module.exports = {
  DEFAULT_CACHE_DIR,
  DEFAULT_CACHE_FILE,
  DEFAULT_PACKAGE_MAIN_ENTRY,
  DEFAULT_FINGERPRINT_INPUTS,
  getPackageFingerprint,
  loadCacheState,
  saveCacheState,
  canReusePackagedApp,
  recordPackaged,
};
