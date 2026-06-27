const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { loadDbApiMethods } = require('./contracts.cjs');

const RENDERER_ROOT = 'src/renderer';

function listRendererFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRendererFiles(absolutePath));
      continue;
    }

    if (
      entry.isFile()
      && (absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx'))
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

function getWindowDbAccess(node) {
  if (!ts.isPropertyAccessExpression(node)) {
    return null;
  }

  const method = node.name.text;
  const domainAccess = node.expression;
  if (!ts.isPropertyAccessExpression(domainAccess)) {
    return null;
  }

  const domain = domainAccess.name.text;
  const dbAccess = domainAccess.expression;
  if (!ts.isPropertyAccessExpression(dbAccess)) {
    return null;
  }

  if (dbAccess.name.text !== 'db') {
    return null;
  }

  if (!ts.isIdentifier(dbAccess.expression) || dbAccess.expression.text !== 'window') {
    return null;
  }

  return {
    domain,
    method,
    accessPath: `window.db.${domain}.${method}`,
  };
}

function getImportNames(clause) {
  const names = [];
  if (!clause) {
    return names;
  }

  if (clause.name) {
    names.push(clause.name.text);
  }

  if (clause.namedBindings) {
    if (ts.isNamespaceImport(clause.namedBindings)) {
      names.push(`* as ${clause.namedBindings.name.text}`);
    } else {
      for (const element of clause.namedBindings.elements) {
        names.push(element.name.text);
      }
    }
  }

  return names;
}

function scanRendererContracts(repoRoot = process.cwd()) {
  const dbApiMethods = loadDbApiMethods(repoRoot);
  const rendererRoot = path.join(repoRoot, RENDERER_ROOT);
  const rendererFiles = listRendererFiles(rendererRoot);
  const invalidWindowDbCalls = [];
  const forbiddenImports = [];
  const rawIpcStrings = [];

  for (const absolutePath of rendererFiles) {
    const source = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      absolutePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const relativePath = path.relative(repoRoot, absolutePath);

    function visit(node) {
      const access = getWindowDbAccess(node);
      if (access) {
        const domainMethods = dbApiMethods[access.domain];
        if (!Array.isArray(domainMethods) || !domainMethods.includes(access.method)) {
          invalidWindowDbCalls.push({
            ...access,
            filePath: relativePath,
            line: getLine(sourceFile, node),
          });
        }
      }

      if (
        ts.isImportDeclaration(node)
        && ts.isStringLiteral(node.moduleSpecifier)
        && node.moduleSpecifier.text === 'electron'
      ) {
        forbiddenImports.push({
          filePath: relativePath,
          line: getLine(sourceFile, node),
          moduleSpecifier: node.moduleSpecifier.text,
          importNames: getImportNames(node.importClause),
        });
      }

      if (
        ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === 'require'
        && node.arguments.length > 0
        && ts.isStringLiteral(node.arguments[0])
        && node.arguments[0].text === 'electron'
      ) {
        forbiddenImports.push({
          filePath: relativePath,
          line: getLine(sourceFile, node),
          moduleSpecifier: 'electron',
          importNames: ['require'],
        });
      }

      if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        && node.text.startsWith('db:')
      ) {
        rawIpcStrings.push({
          filePath: relativePath,
          line: getLine(sourceFile, node),
          value: node.text,
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return {
    rendererFiles,
    invalidWindowDbCalls,
    forbiddenImports,
    rawIpcStrings,
  };
}

module.exports = {
  scanRendererContracts,
};
