#!/usr/bin/env node

const path = require('path');
const {
  CODEBASE_MAP_PATH,
  buildCodebaseMapDoc,
  writeIfChanged,
} = require('./lib/generated-docs.cjs');

const repoRoot = process.cwd();
const targetPath = path.join(repoRoot, CODEBASE_MAP_PATH);
const changed = writeIfChanged(targetPath, buildCodebaseMapDoc(repoRoot));

console.log(
  changed
    ? `[docs:generate] Updated ${CODEBASE_MAP_PATH}`
    : `[docs:generate] ${CODEBASE_MAP_PATH} already current`,
);
