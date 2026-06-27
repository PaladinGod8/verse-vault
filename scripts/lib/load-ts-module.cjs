const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const moduleCache = new Map();

function resolveModulePath(request, parentPath) {
  if (!request.startsWith('.') && !path.isAbsolute(request)) {
    return request;
  }

  const basePath = path.isAbsolute(request)
    ? request
    : path.resolve(path.dirname(parentPath), request);

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.cjs`,
    `${basePath}.json`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.cjs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve module "${request}" from ${parentPath}`);
}

function executeModule(modulePath) {
  const cached = moduleCache.get(modulePath);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(modulePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: modulePath,
  }).outputText;

  const moduleRecord = { exports: {} };
  moduleCache.set(modulePath, moduleRecord);

  const localRequire = (request) => {
    const resolved = resolveModulePath(request, modulePath);
    if (resolved === request) {
      return require(request);
    }
    if (resolved.endsWith('.ts') || resolved.endsWith('.tsx')) {
      return executeModule(resolved);
    }
    return require(resolved);
  };

  const wrapped = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    transpiled,
  );

  wrapped(
    moduleRecord.exports,
    localRequire,
    moduleRecord,
    modulePath,
    path.dirname(modulePath),
  );

  return moduleRecord.exports;
}

function loadTsModule(modulePath) {
  return executeModule(path.resolve(modulePath));
}

module.exports = {
  loadTsModule,
};
