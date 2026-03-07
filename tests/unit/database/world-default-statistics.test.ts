import path from 'path';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
} from '../../../src/shared/statisticsTypes';

describe('World Default Statistics', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../.vite/build/main.js')],
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  afterAll(async () => {
    await electronApp.close();
  });

  it('should create world with default statistics when config not provided', async () => {
    const world = await window.evaluate(async () => {
      return self.db.worlds.add({ name: 'Test World Default Stats' });
    });

    expect(world.config).toBeDefined();
    expect(world.config).not.toBe('{}');

    const config = JSON.parse(world.config);
    expect(config.statistics).toBeDefined();
    expect(config.statistics.resources).toBeInstanceOf(Array);
    expect(config.statistics.passiveScores).toBeInstanceOf(Array);

    const resourceIds = config.statistics.resources.map(
      (r: ResourceStatisticDefinition) => r.id,
    );
    expect(resourceIds).toContain('hp');
    expect(resourceIds).toContain('mp');
    expect(resourceIds).toContain('ac');
    expect(resourceIds).toContain('spd');
    expect(resourceIds).toContain('ap');

    // Verify default passive scores exist
    const passiveScoreIds = config.statistics.passiveScores.map(
      (ps: PassiveScoreDefinition) => ps.id,
    );
    expect(passiveScoreIds).toContain('str');
    expect(passiveScoreIds).toContain('dex');
    expect(passiveScoreIds).toContain('con');
    expect(passiveScoreIds).toContain('int');
    expect(passiveScoreIds).toContain('wis');
    expect(passiveScoreIds).toContain('cha');
    expect(passiveScoreIds).toContain('pb');
  });

  it('should respect provided config and not override with defaults', async () => {
    const customConfig = JSON.stringify({
      statistics: {
        resources: [
          {
            id: 'custom',
            name: 'Custom Resource',
            abbreviation: 'CR',
            isDefault: true,
          },
        ],
        passiveScores: [],
      },
    });

    const world = await window.evaluate(async (cfg) => {
      return self.db.worlds.add({
        name: 'Test World Custom Config',
        config: cfg,
      });
    }, customConfig);

    expect(world.config).toBe(customConfig);

    const config = JSON.parse(world.config);
    expect(config.statistics.resources).toHaveLength(1);
    expect(config.statistics.resources[0].id).toBe('custom');
    expect(config.statistics.passiveScores).toHaveLength(0);
  });

  it('should have isDefault=true for all default statistics', async () => {
    const world = await window.evaluate(async () => {
      return self.db.worlds.add({ name: 'Test World Default Flags' });
    });

    const config = JSON.parse(world.config);

    // All default resources should have isDefault: true
    const allResourcesDefault = config.statistics.resources.every(
      (r: ResourceStatisticDefinition) => r.isDefault === true,
    );
    expect(allResourcesDefault).toBe(true);

    // All default passive scores should have isDefault: true
    const allPassiveScoresDefault = config.statistics.passiveScores.every(
      (ps: PassiveScoreDefinition) => ps.isDefault === true,
    );
    expect(allPassiveScoresDefault).toBe(true);
  });
});
