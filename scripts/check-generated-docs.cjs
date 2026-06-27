#!/usr/bin/env node

const fs = require('fs');
const { getGeneratedDocs } = require('./lib/generated-docs.cjs');

const repoRoot = process.cwd();
const staleDocs = getGeneratedDocs(repoRoot).filter((doc) => {
  const current = fs.existsSync(doc.path) ? fs.readFileSync(doc.path, 'utf8') : '';
  return current !== doc.content;
});

if (staleDocs.length > 0) {
  console.error('[docs:check] Generated docs are stale.');
  for (const doc of staleDocs) {
    console.error(`- ${doc.relativePath}`);
  }
  console.error('[docs:check] Run `yarn docs:generate` and stage the updated docs.');
  process.exit(1);
}

console.log('[docs:check] Generated docs are current.');
