#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const argSet = new Set(args);

const options = {
  staged: argSet.has('--staged'),
  full: argSet.has('--full'),
  freshCache: argSet.has('--fresh-cache'),
  noE2E: argSet.has('--no-e2e'),
  help: argSet.has('--help') || argSet.has('-h'),
  base: null,
};

for (const arg of args) {
  if (arg.startsWith('--base=')) {
    options.base = arg.slice('--base='.length).trim() || null;
  }
}

const CACHE_STATE_DIR = path.resolve('.cache', 'verify-smart');
const CACHE_STATE_FILE = path.join(CACHE_STATE_DIR, 'state.json');
const ESLINT_CACHE_LOCATION = 'node_modules/.cache/eslint/.eslintcache';
const PACKAGE_MAIN_ENTRY = path.resolve('.vite', 'build', 'main.js');
const TASK_TIMEOUT_MS = 20 * 60 * 1000;

const FORMATTABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.cjs',
  '.mjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

const LINTABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.yml', '.yaml']);

const HIGH_RISK_UNIT_PREFIXES = [
  'src/main/',
  'src/database/',
  'src/shared/',
];

const HIGH_RISK_UNIT_FILES = new Set([
  'src/main.ts',
  'src/preload.ts',
  'forge.env.d.ts',
  'vitest.config.ts',
  'package.json',
  'yarn.lock',
]);

const FULL_E2E_PREFIXES = [];

const FULL_E2E_FILES = new Set([
  'forge.config.ts',
  'forge.ignore.ts',
  'vite.base.config.ts',
  'vite.main.config.ts',
  'vite.preload.config.ts',
  'vite.renderer.config.ts',
  'playwright.config.ts',
  'package.json',
  'yarn.lock',
]);

const GENERATED_DOC_SOURCE_FILES = new Set([
  'src/main.ts',
  'src/preload.ts',
  'src/database/db.ts',
  'src/renderer/App.tsx',
  'forge.env.d.ts',
  'docs/02_CODEBASE_MAP.md',
  'docs/03_IPC_CONTRACT.md',
  'scripts/generate-codebase-map.cjs',
  'scripts/generate-ipc-contract-docs.cjs',
  'scripts/lib/generated-docs.cjs',
]);

const GENERATED_DOC_SOURCE_PREFIXES = [
  'src/shared/',
  'src/main/ipc/',
];

const CONTRACT_GUARD_FILES = new Set([
  'src/main.ts',
  'src/preload.ts',
  'forge.env.d.ts',
]);

const CONTRACT_GUARD_PREFIXES = [
  'src/shared/',
  'src/main/',
];

const SMOKE_REGRESSION_SPECS = [
  'tests/e2e/app.test.ts',
  'tests/e2e/statblocks-crud.test.ts',
  'tests/e2e/statblocks.test.ts',
];

const DOMAIN_E2E_RULES = [
  {
    pattern: /(abilit|casting-range)/,
    specs: [
      'tests/e2e/abilities.test.ts',
      'tests/e2e/casting-range-overlay.test.ts',
    ],
  },
  {
    pattern: /(battlemap|runtime|casting-range)/,
    specs: [
      'tests/e2e/battlemaps.test.ts',
      'tests/e2e/battlemap-runtime-play.test.ts',
      'tests/e2e/battlemap-runtime-statblock-popup.test.ts',
      'tests/e2e/casting-range-overlay.test.ts',
    ],
  },
  {
    pattern: /token/,
    specs: [
      'tests/e2e/tokenMove.test.ts',
      'tests/e2e/tokens.test.ts',
    ],
  },
  {
    pattern: /statblock/,
    specs: [
      'tests/e2e/statblocks.test.ts',
      'tests/e2e/statblocks-crud.test.ts',
      'tests/e2e/statblock-statistics.test.ts',
      'tests/e2e/battlemap-runtime-statblock-popup.test.ts',
    ],
  },
  {
    pattern: /(world|statistics)/,
    specs: [
      'tests/e2e/world-default-statistics.test.ts',
      'tests/e2e/world-statistics-config.test.ts',
      'tests/e2e/statblock-statistics.test.ts',
    ],
  },
  {
    pattern: /(campaign|arc|act|session|scene)/,
    specs: ['tests/e2e/arc-act.test.ts'],
  },
];

const PACKAGE_FINGERPRINT_INPUTS = [
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

function printUsage() {
  console.log(`Usage:
  node scripts/verify-smart.cjs [--staged] [--base=<ref>] [--no-e2e] [--full] [--fresh-cache]

Behavior:
  - defaults to git diff against HEAD plus untracked files
  - narrows unit tests with Vitest dependency selection when safe
  - selects E2E regressions by conservative domain rules
  - reuses existing package output when the packaged-input fingerprint matches
  `);
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    encoding: 'utf8',
    shell: false,
    stdio: options.inherit ? 'inherit' : 'pipe',
    env: { ...process.env, ...(options.env || {}) },
    timeout: options.timeout ?? TASK_TIMEOUT_MS,
  });
}

function runGit(commandArgs, options = {}) {
  if (process.platform === 'win32') {
    const comSpec = process.env.ComSpec || 'cmd.exe';
    return run(comSpec, ['/d', '/s', '/c', 'git', ...commandArgs], options);
  }
  return run('git', commandArgs, options);
}

function runYarn(commandArgs, options = {}) {
  if (process.platform === 'win32') {
    const comSpec = process.env.ComSpec || 'cmd.exe';
    return run(comSpec, ['/d', '/s', '/c', 'yarn', ...commandArgs], options);
  }
  return run('yarn', commandArgs, options);
}

function normalizePath(filePath) {
  return filePath.trim().replace(/\\/g, '/');
}

function parseLines(stdout) {
  return stdout
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function fail(message, result = null) {
  console.error(`[verify-smart] ${message}`);
  if (result?.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(1);
}

function ensureGitRepo() {
  const result = runGit(['rev-parse', '--is-inside-work-tree']);
  if (result.error) {
    fail('Failed to execute git.', result);
  }
  if (result.status !== 0) {
    fail('Not inside a Git work tree.', result);
  }
}

function resolveBaseRef(baseRef) {
  const candidates = [`origin/${baseRef}`, baseRef];
  for (const candidate of candidates) {
    const verify = runGit(['rev-parse', '--verify', '--quiet', candidate]);
    if (!verify.error && verify.status === 0) {
      return candidate;
    }
  }
  return null;
}

function listChangedFiles() {
  ensureGitRepo();

  let changed = [];
  if (options.base) {
    const resolvedBase = resolveBaseRef(options.base);
    if (!resolvedBase) {
      fail(`Could not resolve base ref "${options.base}".`);
    }
    const diffResult = runGit([
      'diff',
      '--name-only',
      '--diff-filter=ACMRD',
      `${resolvedBase}...HEAD`,
    ]);
    if (diffResult.error || diffResult.status !== 0) {
      fail(`Failed to diff against base ref "${resolvedBase}".`, diffResult);
    }
    changed = parseLines(diffResult.stdout);
  } else if (options.staged) {
    const diffResult = runGit([
      'diff',
      '--cached',
      '--name-only',
      '--diff-filter=ACMRD',
    ]);
    if (diffResult.error || diffResult.status !== 0) {
      fail('Failed to read staged files.', diffResult);
    }
    changed = parseLines(diffResult.stdout);
  } else {
    const diffResult = runGit([
      'diff',
      '--name-only',
      '--diff-filter=ACMRD',
      'HEAD',
    ]);
    if (diffResult.error || diffResult.status !== 0) {
      fail('Failed to read files changed from HEAD.', diffResult);
    }
    changed = parseLines(diffResult.stdout);

    const untrackedResult = runGit([
      'ls-files',
      '--others',
      '--exclude-standard',
    ]);
    if (untrackedResult.error || untrackedResult.status !== 0) {
      fail('Failed to read untracked files.', untrackedResult);
    }
    changed.push(...parseLines(untrackedResult.stdout));
  }

  return [...new Set(changed)].sort((left, right) => left.localeCompare(right));
}

function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

function isMarkdown(filePath) {
  return getExtension(filePath) === '.md';
}

function isFormattable(filePath) {
  return FORMATTABLE_EXTENSIONS.has(getExtension(filePath)) && fileExists(filePath);
}

function isLintable(filePath) {
  return LINTABLE_EXTENSIONS.has(getExtension(filePath)) && fileExists(filePath);
}

function isUnitTestFile(filePath) {
  return filePath.startsWith('tests/unit/') && /\.test\.(ts|tsx)$/.test(filePath);
}

function isE2ETestFile(filePath) {
  return filePath.startsWith('tests/e2e/') && /\.test\.ts$/.test(filePath);
}

function isAppSourceFile(filePath) {
  return filePath.startsWith('src/') || filePath === 'forge.env.d.ts';
}

function isTypecheckRelevantFile(filePath) {
  return (
    /\.(ts|tsx)$/.test(filePath)
    || filePath === 'package.json'
    || filePath === 'yarn.lock'
    || filePath.startsWith('src/')
    || filePath === 'forge.env.d.ts'
    || filePath.startsWith('tests/')
    || filePath.startsWith('vite.')
    || filePath === 'vitest.config.ts'
    || filePath === 'playwright.config.ts'
    || filePath === 'forge.config.ts'
  );
}

function hasAnyPrefix(filePath, prefixes) {
  return prefixes.some((prefix) => filePath.startsWith(prefix));
}

function fileContentsInclude(filePath, text) {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8').includes(text);
  } catch {
    return false;
  }
}

function isGeneratedDocSourceRelevant(filePath) {
  return GENERATED_DOC_SOURCE_FILES.has(filePath)
    || hasAnyPrefix(filePath, GENERATED_DOC_SOURCE_PREFIXES);
}

function isRendererWindowDbCallsite(filePath) {
  return filePath.startsWith('src/renderer/')
    && fileExists(filePath)
    && fileContentsInclude(filePath, 'window.db');
}

function isContractGuardRelevant(filePath) {
  return CONTRACT_GUARD_FILES.has(filePath)
    || hasAnyPrefix(filePath, CONTRACT_GUARD_PREFIXES)
    || isRendererWindowDbCallsite(filePath);
}

function collectChangedSummary(changedFiles) {
  const summary = {
    changedFiles,
    markdownFiles: changedFiles.filter(isMarkdown),
    formattableFiles: changedFiles.filter(isFormattable),
    lintableFiles: changedFiles.filter(isLintable),
    unitTestFiles: changedFiles.filter(isUnitTestFile),
    e2eTestFiles: changedFiles.filter(isE2ETestFile),
    appSourceFiles: changedFiles.filter(isAppSourceFile),
    hasTypecheckRelevantChanges: changedFiles.some(isTypecheckRelevantFile),
    hasHighRiskUnitChanges: changedFiles.some(
      (filePath) =>
        HIGH_RISK_UNIT_FILES.has(filePath) || hasAnyPrefix(filePath, HIGH_RISK_UNIT_PREFIXES),
    ),
    hasFullE2EChanges: changedFiles.some(
      (filePath) => FULL_E2E_FILES.has(filePath) || hasAnyPrefix(filePath, FULL_E2E_PREFIXES),
    ),
    hasMediumRiskE2EChanges: changedFiles.some(
      (filePath) =>
        filePath === 'src/main.ts'
        || filePath === 'src/preload.ts'
        || filePath === 'forge.env.d.ts'
        || filePath.startsWith('src/main/')
        || filePath.startsWith('src/database/')
        || filePath.startsWith('src/shared/'),
    ),
    hasGeneratedDocRelevantChanges: changedFiles.some(isGeneratedDocSourceRelevant),
    hasContractGuardRelevantChanges: changedFiles.some(isContractGuardRelevant),
    hasE2ETimingGuardRelevantChanges: changedFiles.some(isE2ETestFile),
  };

  summary.hasAppRelevantChanges = summary.appSourceFiles.length > 0
    || summary.e2eTestFiles.length > 0;
  summary.docsOnly = changedFiles.length > 0
    && changedFiles.every(
      (filePath) => isMarkdown(filePath) || filePath.startsWith('.github/'),
    );

  return summary;
}

function shouldRunDocsCheck(summary) {
  return summary.hasGeneratedDocRelevantChanges;
}

function shouldRunContractGuard(summary) {
  return summary.hasContractGuardRelevantChanges;
}

function shouldRunE2ETimingGuard(summary) {
  return summary.hasE2ETimingGuardRelevantChanges;
}

function uniqueExistingFiles(filePaths) {
  return [...new Set(filePaths.filter((filePath) => fileExists(filePath)))];
}

function chooseUnitMode(summary) {
  if (options.full) {
    return 'full';
  }
  if (summary.docsOnly) {
    return 'none';
  }
  if (!summary.hasAppRelevantChanges && summary.unitTestFiles.length === 0) {
    return 'none';
  }
  if (summary.hasHighRiskUnitChanges) {
    return 'full';
  }
  if (
    summary.unitTestFiles.length > 0
    && summary.appSourceFiles.length === 0
    && summary.unitTestFiles.length === summary.changedFiles.length
  ) {
    return 'targeted-tests';
  }
  return 'related';
}

function chooseE2EMode(summary) {
  if (options.noE2E) {
    return 'none';
  }
  if (options.full) {
    return 'full';
  }
  if (!summary.hasAppRelevantChanges) {
    return 'none';
  }
  if (summary.hasFullE2EChanges) {
    return 'full';
  }
  if (summary.hasMediumRiskE2EChanges) {
    return 'smoke-plus-targeted';
  }
  return 'targeted';
}

function pickTargetedE2ESpecs(summary) {
  const specs = new Set(summary.e2eTestFiles);

  if (summary.hasAppRelevantChanges) {
    specs.add('tests/e2e/app.test.ts');
  }

  const appPaths = [...summary.appSourceFiles, ...summary.e2eTestFiles].map((filePath) =>
    filePath.toLowerCase()
  );

  for (const filePath of appPaths) {
    for (const rule of DOMAIN_E2E_RULES) {
      if (rule.pattern.test(filePath)) {
        for (const spec of rule.specs) {
          specs.add(spec);
        }
      }
    }
  }

  if (chooseE2EMode(summary) === 'smoke-plus-targeted') {
    for (const spec of SMOKE_REGRESSION_SPECS) {
      specs.add(spec);
    }
  }

  return uniqueExistingFiles([...specs]).sort((left, right) => left.localeCompare(right));
}

function runTask(label, commandArgs, options = {}) {
  console.log(`[verify-smart] ${label}`);
  const result = runYarn(commandArgs, { inherit: true, ...options });
  if (result.error) {
    fail(`Failed to start command: yarn ${commandArgs.join(' ')}`, result);
  }
  if (result.status !== 0) {
    fail(`Command failed: yarn ${commandArgs.join(' ')}`, result);
  }
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

function getPackageFingerprint() {
  const files = PACKAGE_FINGERPRINT_INPUTS.flatMap((inputPath) => walkFiles(inputPath));
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

function loadCacheState() {
  try {
    if (!fs.existsSync(CACHE_STATE_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(CACHE_STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCacheState(state) {
  fs.mkdirSync(CACHE_STATE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function resetSmartCache() {
  fs.rmSync(path.resolve('.vite'), { recursive: true, force: true });
  fs.rmSync(path.resolve('out'), { recursive: true, force: true });
  fs.rmSync(path.resolve(CACHE_STATE_DIR), { recursive: true, force: true });
}

function maybeRunFormat(summary) {
  if (summary.formattableFiles.length === 0) {
    return;
  }
  runTask(
    `Check formatting on changed files (${summary.formattableFiles.length})`,
    ['dprint', 'check', ...summary.formattableFiles],
  );
}

function maybeRunTypecheck(summary) {
  if (!summary.hasTypecheckRelevantChanges) {
    return;
  }
  runTask('Type check TypeScript', ['type-check']);
}

function maybeRunDocsCheck(summary) {
  if (!shouldRunDocsCheck(summary)) {
    return;
  }
  runTask('Check generated docs freshness', ['docs:check']);
}

function maybeRunContractGuard(summary) {
  if (!shouldRunContractGuard(summary)) {
    return;
  }
  runTask('Guard shared contracts', ['guard:contracts']);
}

function maybeRunE2ETimingGuard(summary) {
  if (!shouldRunE2ETimingGuard(summary)) {
    return;
  }
  runTask('Guard E2E timing', ['guard:e2e-timing']);
}

function maybeRunLint(summary) {
  if (summary.lintableFiles.length > 0) {
    runTask(
      `Lint changed source files (${summary.lintableFiles.length})`,
      [
        'eslint',
        '--cache',
        '--cache-location',
        ESLINT_CACHE_LOCATION,
        '--max-warnings=0',
        ...summary.lintableFiles,
      ],
    );
  }

  if (summary.markdownFiles.length > 0) {
    const markdownLintScript = options.staged ? 'lint:md:staged' : 'lint:md:changed';
    const valeLintScript = options.staged ? 'lint:vale:staged' : 'lint:vale:changed';

    runTask('Lint changed markdown structure', [markdownLintScript]);
    runTask('Lint changed markdown prose', [valeLintScript]);
  }
}

function maybeRunSecretScan(summary) {
  if (summary.changedFiles.length === 0) {
    return;
  }

  runTask('Scan secrets in working tree', ['security:secrets:working-tree']);
}

function maybeRunUnit(summary) {
  const unitMode = chooseUnitMode(summary);

  if (unitMode === 'none') {
    console.log('[verify-smart] Skipping unit tests.');
    return;
  }

  if (unitMode === 'full') {
    runTask('Run full unit suite (high blast radius)', ['test:unit:quick']);
    return;
  }

  if (unitMode === 'targeted-tests') {
    runTask(
      `Run changed unit test files (${summary.unitTestFiles.length})`,
      ['vitest', 'run', ...summary.unitTestFiles, '--passWithNoTests'],
    );
    return;
  }

  const relatedInputs = uniqueExistingFiles(
    [...summary.appSourceFiles, ...summary.unitTestFiles].filter((filePath) =>
      /\.(ts|tsx)$/.test(filePath)
    ),
  );

  if (relatedInputs.length === 0) {
    console.log('[verify-smart] No Vitest-related inputs found. Skipping unit tests.');
    return;
  }

  runTask(
    `Run related unit tests for changed source/test files (${relatedInputs.length})`,
    ['vitest', 'related', ...relatedInputs, '--passWithNoTests'],
  );
}

function maybePackageForE2E() {
  const packageFingerprint = getPackageFingerprint();
  const cacheState = loadCacheState();
  const cachedFingerprint = cacheState.package?.fingerprint;
  const canReuse = cachedFingerprint === packageFingerprint && fs.existsSync(PACKAGE_MAIN_ENTRY);

  if (canReuse) {
    console.log('[verify-smart] Reusing existing package output (.vite fingerprint match).');
    return;
  }

  runTask('Package app for E2E', ['package']);
  saveCacheState({
    ...cacheState,
    package: {
      fingerprint: packageFingerprint,
      timestamp: new Date().toISOString(),
    },
  });
}

function maybeRunE2E(summary) {
  const e2eMode = chooseE2EMode(summary);

  if (e2eMode === 'none') {
    console.log('[verify-smart] Skipping E2E tests.');
    return;
  }

  maybePackageForE2E();

  if (e2eMode === 'full') {
    runTask('Run full E2E suite', ['playwright', 'test'], {
      env: { PLAYWRIGHT_HTML_OPEN: 'never' },
    });
    return;
  }

  const specs = pickTargetedE2ESpecs(summary);
  if (specs.length === 0) {
    console.log('[verify-smart] No targeted E2E specs selected. Skipping E2E tests.');
    return;
  }

  runTask(
    `Run targeted E2E specs (${specs.length})`,
    ['playwright', 'test', ...specs],
    { env: { PLAYWRIGHT_HTML_OPEN: 'never' } },
  );
}

function main() {
  if (options.help) {
    printUsage();
    return;
  }

  if (options.freshCache) {
    console.log('[verify-smart] Resetting smart cache and package artifacts.');
    resetSmartCache();
  }

  const changedFiles = listChangedFiles();
  if (changedFiles.length === 0) {
    console.log('[verify-smart] No changed files detected. Nothing to run.');
    return;
  }

  const summary = collectChangedSummary(changedFiles);

  console.log(`[verify-smart] Changed files: ${summary.changedFiles.length}`);
  for (const filePath of summary.changedFiles) {
    console.log(`  - ${filePath}`);
  }

  console.log(
    `[verify-smart] Unit mode: ${chooseUnitMode(summary)} | E2E mode: ${chooseE2EMode(summary)}`,
  );

  if (chooseE2EMode(summary) !== 'none' && chooseE2EMode(summary) !== 'full') {
    const selectedSpecs = pickTargetedE2ESpecs(summary);
    console.log(
      `[verify-smart] Targeted E2E specs: ${
        selectedSpecs.length > 0 ? selectedSpecs.join(', ') : '(none)'
      }`,
    );
  }

  maybeRunFormat(summary);
  maybeRunTypecheck(summary);
  maybeRunDocsCheck(summary);
  maybeRunContractGuard(summary);
  maybeRunE2ETimingGuard(summary);
  maybeRunSecretScan(summary);
  maybeRunLint(summary);
  maybeRunUnit(summary);
  maybeRunE2E(summary);

  console.log('[verify-smart] Complete.');
}

module.exports = {
  collectChangedSummary,
  chooseUnitMode,
  chooseE2EMode,
  pickTargetedE2ESpecs,
  shouldRunDocsCheck,
  shouldRunContractGuard,
  shouldRunE2ETimingGuard,
};

if (require.main === module) {
  main();
}
