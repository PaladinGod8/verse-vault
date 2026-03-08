#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PARTITION_DEFINITIONS = {
  all: {
    description: 'All tracked Markdown files in the repository.',
    match: () => true,
  },
  root: {
    description: 'Tracked Markdown files at repository root.',
    match: (filePath) => !filePath.includes('/'),
  },
  docs: {
    description: 'All tracked Markdown files under docs/.',
    match: (filePath) => filePath.startsWith('docs/'),
  },
  core: {
    description: 'Core orientation docs + root guides for agent re-entry.',
    match: (filePath) =>
      new Set([
        'README.md',
        'AGENTS.md',
        'docs/00_INDEX.md',
        'docs/01_ARCHITECTURE.md',
        'docs/02_CODEBASE_MAP.md',
        'docs/03_IPC_CONTRACT.md',
        'docs/06_AGENTIC_TESTING_QUALITY_GATE.md',
        'docs/CHECKLIST.md',
      ]).has(filePath),
  },
  features: {
    description: 'Tracked Markdown under docs/features/.',
    match: (filePath) => filePath.startsWith('docs/features/'),
  },
  logs: {
    description: 'Tracked Markdown under docs/logs/.',
    match: (filePath) => filePath.startsWith('docs/logs/'),
  },
  prompts: {
    description: 'Tracked Markdown under docs/prompts/.',
    match: (filePath) => filePath.startsWith('docs/prompts/'),
  },
  adr: {
    description: 'Tracked Markdown under docs/adr/.',
    match: (filePath) => filePath.startsWith('docs/adr/'),
  },
  vsnotes: {
    description: 'Tracked Markdown under docs/vsnotes/.',
    match: (filePath) => filePath.startsWith('docs/vsnotes/'),
  },
};

const TOOL_DEFINITIONS = {
  markdownlint: {
    label: 'markdownlint-cli2',
    binName: process.platform === 'win32' ? 'markdownlint-cli2.cmd' : 'markdownlint-cli2',
    extraArgs: ['--config', '.markdownlint-cli2.jsonc'],
    supportsFix: true,
  },
  vale: {
    label: 'Vale',
    binName: process.platform === 'win32' ? 'vale.cmd' : 'vale',
    extraArgs: ['--config', '.vale.ini'],
    supportsFix: false,
  },
};

function normalizePath(filePath) {
  return filePath.trim().replace(/\\/g, '/');
}

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    encoding: 'utf8',
    shell: false,
    stdio: 'pipe',
  });
}

function parseLines(stdout) {
  return stdout
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function runGit(commandArgs) {
  const result = process.platform === 'win32'
    ? run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'git', ...commandArgs])
    : run('git', commandArgs);
  if (result.error || result.status !== 0) {
    return { ok: false, files: [] };
  }
  return { ok: true, files: parseLines(result.stdout) };
}

function getTrackedMarkdownFiles() {
  const tracked = runGit(['ls-files', '--', '*.md']);
  if (!tracked.ok) {
    console.error('[lint:md] Failed to list tracked markdown files via git ls-files.');
    process.exit(2);
  }
  return tracked.files;
}

function getStagedMarkdownFiles() {
  const staged = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.md']);
  if (!staged.ok) {
    console.error('[lint:md] Failed to list staged markdown files via git diff --cached.');
    process.exit(2);
  }
  return staged.files;
}

function getChangedMarkdownFiles() {
  const changed = runGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD', '--', '*.md']);
  if (!changed.ok) {
    console.error('[lint:md] Failed to list changed markdown files via git diff HEAD.');
    process.exit(2);
  }
  return changed.files;
}

function resolveBaseRef(baseRef) {
  const candidates = [`origin/${baseRef}`, baseRef];
  for (const candidate of candidates) {
    const verify = process.platform === 'win32'
      ? run(process.env.ComSpec || 'cmd.exe', [
        '/d',
        '/s',
        '/c',
        'git',
        'rev-parse',
        '--verify',
        '--quiet',
        candidate,
      ])
      : run('git', ['rev-parse', '--verify', '--quiet', candidate]);
    if (!verify.error && verify.status === 0) {
      return candidate;
    }
  }
  return null;
}

function getPrDiffMarkdownFiles() {
  const baseRefRaw = process.env.GITHUB_BASE_REF;
  const headRefRaw = process.env.GITHUB_SHA;
  const baseRef = baseRefRaw ? baseRefRaw.trim() : '';
  const headRef = headRefRaw ? headRefRaw.trim() : 'HEAD';

  if (!baseRef) {
    return { ok: false, reason: 'missing-or-unresolvable-pr-diff-context', files: [] };
  }

  const resolvedBaseRef = resolveBaseRef(baseRef);
  if (!resolvedBaseRef) {
    return { ok: false, reason: 'missing-or-unresolvable-pr-diff-context', files: [] };
  }

  const mergeBaseResult = run('git', ['merge-base', resolvedBaseRef, headRef]);
  const mergeBase = !mergeBaseResult.error && mergeBaseResult.status === 0
    ? mergeBaseResult.stdout.trim()
    : '';

  const range = mergeBase
    ? `${mergeBase}...${headRef}`
    : `${resolvedBaseRef}..${headRef}`;

  const diffResult = run('git', ['diff', '--name-only', '--diff-filter=ACMR', range, '--', '*.md']);
  if (diffResult.error || diffResult.status !== 0) {
    return { ok: false, reason: 'git-diff-failed', files: [] };
  }

  return { ok: true, reason: 'ok', files: parseLines(diffResult.stdout) };
}

function parseOptions() {
  const rawArgs = process.argv.slice(2);
  const options = {
    mode: 'tracked',
    fix: false,
    listPartitions: false,
    partitionNames: ['all'],
    tool: '',
  };

  for (const arg of rawArgs) {
    if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    } else if (arg === '--staged') {
      options.mode = 'staged';
    } else if (arg === '--changed') {
      options.mode = 'changed';
    } else if (arg === '--pr-diff') {
      options.mode = 'pr-diff';
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--list-partitions') {
      options.listPartitions = true;
    } else if (arg.startsWith('--partition=')) {
      const value = arg.split('=')[1] || '';
      const parsed = value
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      options.partitionNames = parsed.length > 0 ? parsed : ['all'];
    } else if (arg.startsWith('--tool=')) {
      options.tool = (arg.split('=')[1] || '').trim();
    } else {
      console.error(`[lint:md] Unknown argument: ${arg}`);
      printHelpAndExit(1);
    }
  }

  return options;
}

function printPartitions() {
  console.log('Available markdown lint partitions:');
  for (const [name, definition] of Object.entries(PARTITION_DEFINITIONS)) {
    console.log(`- ${name}: ${definition.description}`);
  }
}

function printHelpAndExit(exitCode) {
  console.log(`Usage:
  node scripts/lint-tracked-markdown.cjs --tool=markdownlint [--partition=all|core|docs|features|logs|prompts|adr|vsnotes|root] [--staged|--changed|--pr-diff] [--fix]
  node scripts/lint-tracked-markdown.cjs --tool=vale [--partition=...] [--staged|--changed|--pr-diff]
  node scripts/lint-tracked-markdown.cjs --list-partitions
`);
  process.exit(exitCode);
}

function ensureValidTool(options) {
  if (!options.tool) {
    console.error('[lint:md] Missing required argument: --tool=<markdownlint|vale>');
    printHelpAndExit(1);
  }

  if (!Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, options.tool)) {
    console.error(`[lint:md] Unsupported tool "${options.tool}".`);
    printHelpAndExit(1);
  }

  const tool = TOOL_DEFINITIONS[options.tool];
  if (options.fix && !tool.supportsFix) {
    console.error(`[lint:md] --fix is not supported for tool "${options.tool}".`);
    process.exit(1);
  }

  return tool;
}

function ensureValidPartitions(partitionNames) {
  const invalid = partitionNames.filter(
    (name) => !Object.prototype.hasOwnProperty.call(PARTITION_DEFINITIONS, name),
  );
  if (invalid.length > 0) {
    console.error(`[lint:md] Unknown partition(s): ${invalid.join(', ')}`);
    printPartitions();
    process.exit(1);
  }
}

function getCandidateFiles(mode) {
  switch (mode) {
    case 'tracked':
      return getTrackedMarkdownFiles();
    case 'staged':
      return getStagedMarkdownFiles();
    case 'changed':
      return getChangedMarkdownFiles();
    case 'pr-diff': {
      const prDiff = getPrDiffMarkdownFiles();
      if (!prDiff.ok) {
        console.log(`[lint:md] mode=pr-diff fallback=tracked reason=${prDiff.reason}`);
        return getTrackedMarkdownFiles();
      }
      return prDiff.files;
    }
    default:
      return getTrackedMarkdownFiles();
  }
}

function partitionFiles(files, partitionNames) {
  const trackedSet = new Set(getTrackedMarkdownFiles());
  const selectedFiles = files.filter((filePath) => trackedSet.has(filePath));
  const selectedSet = new Set();
  for (const partitionName of partitionNames) {
    const partition = PARTITION_DEFINITIONS[partitionName];
    for (const filePath of selectedFiles) {
      if (partition.match(filePath)) {
        selectedSet.add(filePath);
      }
    }
  }
  return Array.from(selectedSet).sort();
}

function chunk(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function resolveToolPath(binName) {
  const binPath = path.resolve('node_modules', '.bin', binName);
  if (fs.existsSync(binPath)) {
    return binPath;
  }
  return binName;
}

function runTool(toolName, files, fix) {
  const tool = TOOL_DEFINITIONS[toolName];
  const executable = resolveToolPath(tool.binName);
  const fileChunks = chunk(files, 80);

  for (const fileChunk of fileChunks) {
    const args = [...tool.extraArgs];
    if (fix) {
      args.push('--fix');
    }
    args.push(...fileChunk);

    const result = spawnSync(executable, args, {
      stdio: 'inherit',
      shell: false,
    });

    if (result.error) {
      console.error(`[lint:md] Failed to start ${tool.label}.`);
      console.error(result.error.message);
      return 2;
    }

    if ((result.status ?? 1) !== 0) {
      return result.status ?? 1;
    }
  }

  return 0;
}

function main() {
  const options = parseOptions();

  if (options.listPartitions) {
    printPartitions();
    return;
  }

  const tool = ensureValidTool(options);
  ensureValidPartitions(options.partitionNames);

  const candidates = getCandidateFiles(options.mode);
  const filesToLint = partitionFiles(candidates, options.partitionNames);

  console.log(
    `[lint:md] tool=${options.tool} mode=${options.mode} partitions=${
      options.partitionNames.join(',')
    } count=${filesToLint.length}`,
  );

  if (filesToLint.length === 0) {
    console.log('[lint:md] No tracked markdown files matched the requested scope.');
    return;
  }

  const exitCode = runTool(options.tool, filesToLint, options.fix);
  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  console.log(`[lint:md] ${tool.label} passed.`);
}

main();
