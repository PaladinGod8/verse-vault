#!/usr/bin/env node

const fs = require('fs');
const { spawnSync } = require('child_process');

const ESLINT_CACHE_LOCATION = 'node_modules/.cache/eslint/.eslintcache';

function run(command, args, options = {}) {
  if (options.shell === true) {
    const fullCommand = [command, ...args].map(quoteForShell).join(' ');
    return spawnSync(fullCommand, {
      encoding: 'utf8',
      shell: true,
      stdio: options.inherit ? 'inherit' : 'pipe',
    });
  }

  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    stdio: options.inherit ? 'inherit' : 'pipe',
  });
}

function runGit(args) {
  return run('git', args, { shell: false });
}

function runYarn(args, options = {}) {
  if (process.platform === 'win32') {
    const comSpec = process.env.ComSpec || 'cmd.exe';
    return run(comSpec, ['/d', '/s', '/c', 'yarn', ...args], { ...options, shell: false });
  }
  return run('yarn', args, { ...options, shell: false });
}

function quoteForShell(value) {
  if (value.length === 0) {
    return '""';
  }
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
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

function getGitRepoStatus() {
  const result = runGit(['rev-parse', '--is-inside-work-tree']);
  if (result.error) {
    return { ok: false, reason: 'git-command-unavailable' };
  }
  if (result.status !== 0) {
    return { ok: false, reason: 'not-a-git-repository' };
  }
  return { ok: true, reason: 'ok' };
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

function getDiffContext() {
  const baseRefRaw = process.env.GITHUB_BASE_REF;
  const headRefRaw = process.env.GITHUB_SHA;

  const baseRef = baseRefRaw ? baseRefRaw.trim() : '';
  const headRef = headRefRaw ? headRefRaw.trim() : 'HEAD';

  if (!baseRef) {
    return null;
  }

  const resolvedBaseRef = resolveBaseRef(baseRef);
  if (!resolvedBaseRef) {
    return null;
  }

  const mergeBaseResult = runGit(['merge-base', resolvedBaseRef, headRef]);
  const mergeBase = !mergeBaseResult.error && mergeBaseResult.status === 0
    ? mergeBaseResult.stdout.trim()
    : '';

  if (mergeBase) {
    return {
      base: mergeBase,
      head: headRef,
      mode: 'merge-base',
    };
  }

  return {
    base: resolvedBaseRef,
    head: headRef,
    mode: 'direct-diff',
  };
}

function getChangedFiles(diffContext) {
  const range = diffContext.mode === 'merge-base'
    ? `${diffContext.base}...${diffContext.head}`
    : `${diffContext.base}..${diffContext.head}`;
  const diffResult = runGit(['diff', '--name-only', range]);

  if (diffResult.error || diffResult.status !== 0) {
    return null;
  }

  return parseLines(diffResult.stdout);
}

function isLintableFile(filePath) {
  if (!/\.(ts|tsx|yml|yaml)$/i.test(filePath)) {
    return false;
  }
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const trackedResult = runGit(['ls-files', '--error-unmatch', '--', filePath]);
  return !trackedResult.error && trackedResult.status === 0;
}

function runFullFallback(reason) {
  console.log(`[lint:changed] mode=full-fallback reason=${reason}`);
  const fallback = runYarn(['lint'], { inherit: true });
  if (fallback.error) {
    console.error('[lint:changed] Failed to start "yarn lint".');
    console.error(fallback.error.message);
    process.exit(2);
  }
  process.exit(fallback.status ?? 1);
}

function runChangedFilesLint(files) {
  console.log(`[lint:changed] mode=changed-files count=${files.length}`);
  const result = runYarn(
    [
      'eslint',
      '--cache',
      '--cache-location',
      ESLINT_CACHE_LOCATION,
      '--max-warnings=0',
      ...files,
    ],
    { inherit: true },
  );

  if (result.error) {
    console.error('[lint:changed] Failed to start ESLint.');
    console.error(result.error.message);
    process.exit(2);
  }

  process.exit(result.status ?? 1);
}

function main() {
  const repoStatus = getGitRepoStatus();
  if (!repoStatus.ok) {
    runFullFallback(repoStatus.reason);
    return;
  }

  const diffContext = getDiffContext();
  if (!diffContext) {
    runFullFallback('missing-or-unresolvable-pr-diff-context');
    return;
  }

  const changedFiles = getChangedFiles(diffContext);
  if (!changedFiles) {
    runFullFallback('git-diff-failed');
    return;
  }

  const filesToLint = changedFiles.filter(isLintableFile);
  if (filesToLint.length === 0) {
    console.log('[lint:changed] mode=changed-files no lintable file changes');
    process.exit(0);
  }

  runChangedFilesLint(filesToLint);
}

main();
