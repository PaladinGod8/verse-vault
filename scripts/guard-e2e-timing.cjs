#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const E2E_ROOT = 'tests/e2e';

function listE2EFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listE2EFiles(absolutePath));
      continue;
    }

    if (
      entry.isFile()
      && absolutePath.endsWith('.ts')
      && !absolutePath.endsWith('.d.ts')
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getLine(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function getCalleeName(node, sourceFile) {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }

  if (ts.isPropertyAccessExpression(node.expression)) {
    return node.expression.getText(sourceFile);
  }

  return null;
}

function scanE2ETimingIssues(repoRoot = process.cwd()) {
  const e2eRoot = path.join(repoRoot, E2E_ROOT);
  const e2eFiles = listE2EFiles(e2eRoot);
  const forbiddenCalls = [];

  for (const absolutePath of e2eFiles) {
    const source = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const relativePath = path.relative(repoRoot, absolutePath);

    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callee = getCalleeName(node, sourceFile);

        if (
          callee === 'setTimeout'
          || callee === 'sleep'
          || callee === 'delay'
          || callee?.endsWith('.waitForTimeout')
        ) {
          forbiddenCalls.push({
            filePath: relativePath,
            line: getLine(sourceFile, node),
            callee,
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return {
    e2eFiles,
    forbiddenCalls,
  };
}

function main() {
  const report = scanE2ETimingIssues(process.cwd());

  if (report.forbiddenCalls.length === 0) {
    console.log('[guard:e2e-timing] E2E timing checks passed.');
    return;
  }

  console.error('[guard:e2e-timing] Forbidden sleep-like timing calls found:');
  for (const entry of report.forbiddenCalls) {
    console.error(`  - ${entry.filePath}:${entry.line} -> ${entry.callee}`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  scanE2ETimingIssues,
};
