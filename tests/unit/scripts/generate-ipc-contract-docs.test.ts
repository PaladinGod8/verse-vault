import { describe, expect, it } from 'vitest';
import { loadIpcCatalog } from '../../../scripts/lib/contracts.cjs';
import { buildIpcContractDoc } from '../../../scripts/lib/generated-docs.cjs';

describe('generate-ipc-contract-docs', () => {
  it('is deterministic and current-state only', () => {
    const repoRoot = process.cwd();
    const first = buildIpcContractDoc(repoRoot);
    const second = buildIpcContractDoc(repoRoot);

    expect(first).toBe(second);
    expect(first).toContain('<!-- BEGIN GENERATED IPC SUMMARY -->');
    expect(first).toContain('<!-- BEGIN GENERATED IPC TABLE -->');
    expect(first).toContain('`IPC.VERSES_GET_ALL`');
    expect(first).toContain('`window.db.tokens.update`');
    expect(first).not.toMatch(/202\d-/);
  });

  it('includes every IPC catalog entry in the generated table', () => {
    const repoRoot = process.cwd();
    const doc = buildIpcContractDoc(repoRoot);
    const catalog = loadIpcCatalog(repoRoot);

    for (const entry of catalog) {
      expect(doc).toContain(`\`IPC.${entry.key}\``);
      expect(doc).toContain(`\`${entry.bridge}\``);
      expect(doc).toContain(`\`${entry.typeSource}\``);
    }
  });
});
