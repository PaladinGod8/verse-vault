import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
} from '../../src/shared/statisticsTypes';
import { closeApp, launchApp } from './helpers/launchApp';

let app: ElectronApplication;
let page: Page;
let userDataDir: string;

test.describe('World Default Statistics (IPC contract)', () => {
  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    userDataDir = result.userDataDir;
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await closeApp(app, userDataDir);
  });

  test('applies default statistics config when none is provided', async () => {
    const world = await page.evaluate(async () => {
      return window.db.worlds.add({ name: 'IPC Default Stats' });
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

  test('respects provided config and does not apply defaults', async () => {
    const customConfig = JSON.stringify({
      statistics: {
        resources: [
          { id: 'custom', name: 'Custom Resource', abbreviation: 'CR', isDefault: true },
        ],
        passiveScores: [],
      },
    });

    const world = await page.evaluate(async (cfg) => {
      return window.db.worlds.add({ name: 'IPC Custom Config', config: cfg });
    }, customConfig);

    expect(world.config).toBe(customConfig);

    const config = JSON.parse(world.config);
    expect(config.statistics.resources).toHaveLength(1);
    expect(config.statistics.resources[0].id).toBe('custom');
    expect(config.statistics.passiveScores).toHaveLength(0);
  });

  test('all default statistics have isDefault=true', async () => {
    const world = await page.evaluate(async () => {
      return window.db.worlds.add({ name: 'IPC Default Flags' });
    });

    const config = JSON.parse(world.config);

    const allResourcesDefault = config.statistics.resources.every(
      (r: ResourceStatisticDefinition) => r.isDefault === true,
    );
    expect(allResourcesDefault).toBe(true);

    const allPassiveScoresDefault = config.statistics.passiveScores.every(
      (ps: PassiveScoreDefinition) => ps.isDefault === true,
    );
    expect(allPassiveScoresDefault).toBe(true);
  });
});
