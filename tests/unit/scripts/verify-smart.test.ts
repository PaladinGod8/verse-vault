import { describe, expect, it } from 'vitest';
import {
  collectChangedSummary,
  shouldRunContractGuard,
  shouldRunDocsCheck,
  shouldRunE2ETimingGuard,
} from '../../../scripts/verify-smart.cjs';

describe('verify-smart trigger selection', () => {
  it('runs docs check for generated-doc sources and generated docs', () => {
    const sourceSummary = collectChangedSummary(['src/shared/ipcChannels.ts']);
    const generatedDocSummary = collectChangedSummary(['docs/02_CODEBASE_MAP.md']);

    expect(shouldRunDocsCheck(sourceSummary)).toBe(true);
    expect(shouldRunDocsCheck(generatedDocSummary)).toBe(true);
  });

  it('skips docs check for unrelated feature-doc changes', () => {
    const summary = collectChangedSummary(['docs/features/github-actions-setup.md']);

    expect(shouldRunDocsCheck(summary)).toBe(false);
  });

  it('runs contract guard for seam files and renderer window.db callsites', () => {
    const preloadSummary = collectChangedSummary(['src/preload.ts']);
    const rendererSummary = collectChangedSummary(['src/renderer/pages/AbilitiesPage.tsx']);

    expect(shouldRunContractGuard(preloadSummary)).toBe(true);
    expect(shouldRunContractGuard(rendererSummary)).toBe(true);
  });

  it('skips contract guard for unrelated docs-only changes', () => {
    const summary = collectChangedSummary(['docs/04_DEVELOPMENT.md']);

    expect(shouldRunContractGuard(summary)).toBe(false);
  });

  it('runs e2e timing guard only when e2e specs change', () => {
    const e2eSummary = collectChangedSummary(['tests/e2e/app.test.ts']);
    const sharedSummary = collectChangedSummary(['src/shared/ipcChannels.ts']);

    expect(shouldRunE2ETimingGuard(e2eSummary)).toBe(true);
    expect(shouldRunE2ETimingGuard(sharedSummary)).toBe(false);
  });
});
