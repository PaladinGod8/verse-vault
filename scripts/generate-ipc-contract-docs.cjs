#!/usr/bin/env node

const path = require('path');
const {
  IPC_CONTRACT_PATH,
  buildIpcContractDoc,
  writeIfChanged,
} = require('./lib/generated-docs.cjs');

const repoRoot = process.cwd();
const targetPath = path.join(repoRoot, IPC_CONTRACT_PATH);
const changed = writeIfChanged(targetPath, buildIpcContractDoc(repoRoot));

console.log(
  changed
    ? `[docs:generate] Updated ${IPC_CONTRACT_PATH}`
    : `[docs:generate] ${IPC_CONTRACT_PATH} already current`,
);
