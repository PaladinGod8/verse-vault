import { describe, expect, it } from 'vitest';
import { buildCodebaseMapDoc } from '../../../scripts/lib/generated-docs.cjs';

describe('generate-codebase-map', () => {
  it('is deterministic and includes generated seam sections', () => {
    const repoRoot = process.cwd();
    const first = buildCodebaseMapDoc(repoRoot);
    const second = buildCodebaseMapDoc(repoRoot);

    expect(first).toBe(second);
    expect(first).toContain('<!-- BEGIN GENERATED LANDMARKS -->');
    expect(first).toContain('<!-- BEGIN GENERATED ROUTES -->');
    expect(first).toContain('<!-- BEGIN GENERATED REGISTRARS -->');
  });

  it('captures representative routes and role headers', () => {
    const doc = buildCodebaseMapDoc(process.cwd());

    expect(doc).toContain('`/world/:id/tokens`');
    expect(doc).toContain('`TokensPage`');
    expect(doc).toContain('Renderer bridge adapter');
    expect(doc).toContain('`src/main/ipc/registerTokenHandlers.ts`');
  });
});
