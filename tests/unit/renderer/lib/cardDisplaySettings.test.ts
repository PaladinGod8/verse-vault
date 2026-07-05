import { describe, expect, it } from 'vitest';
import {
  applyAspectRatio,
  clampCardDisplayDimension,
  DEFAULT_CARD_DISPLAY_SETTINGS,
  resolveCardDisplayDimensions,
  updateCardDisplaySettings,
} from '../../../../src/renderer/lib/cardDisplaySettings';
import type { AppSettingsConfig } from '../../../../src/shared/contracts/settingsTypes';

describe('clampCardDisplayDimension', () => {
  it('clamps to the min/max bounds and rounds fractional values', () => {
    expect(clampCardDisplayDimension(10)).toBe(48);
    expect(clampCardDisplayDimension(9999)).toBe(640);
    expect(clampCardDisplayDimension(100.6)).toBe(101);
  });
});

describe('resolveCardDisplayDimensions', () => {
  it('falls back to the default when nothing is stored for the surface', () => {
    const config: AppSettingsConfig = {};
    expect(resolveCardDisplayDimensions(config, 'itemCard')).toEqual(
      DEFAULT_CARD_DISPLAY_SETTINGS.itemCard,
    );
  });

  it('uses stored dimensions when present', () => {
    const config: AppSettingsConfig = {
      cardDisplays: { itemCard: { width: 200, height: 100, lockAspectRatio: false } },
    };
    expect(resolveCardDisplayDimensions(config, 'itemCard')).toEqual({
      width: 200,
      height: 100,
      lockAspectRatio: false,
    });
  });
});

describe('updateCardDisplaySettings', () => {
  it('merges a patch into the surface without disturbing other surfaces', () => {
    const current = { itemCard: { width: 200, height: 100, lockAspectRatio: false } };
    const updated = updateCardDisplaySettings(current, 'factionCard', {
      width: 300,
      height: 150,
      lockAspectRatio: true,
    });
    expect(updated.itemCard).toEqual(current.itemCard);
    expect(updated.factionCard).toEqual({ width: 300, height: 150, lockAspectRatio: true });
  });
});

describe('applyAspectRatio', () => {
  it('recomputes height from width when width changed', () => {
    const result = applyAspectRatio('itemCard', { width: 400, height: 100 }, 'width');
    expect(result).toEqual({ width: 400, height: 200, lockAspectRatio: true });
  });

  it('recomputes width from height when height changed', () => {
    const result = applyAspectRatio('itemCard', { width: 400, height: 100 }, 'height');
    expect(result).toEqual({ width: 200, height: 100, lockAspectRatio: true });
  });
});
