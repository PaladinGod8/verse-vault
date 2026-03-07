import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PASSIVE_SCORE_DEFINITIONS,
  DEFAULT_RESOURCE_DEFINITIONS,
  getDefaultWorldConfig,
} from '../../../src/shared/statisticsTypes';
import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
} from '../../../src/shared/statisticsTypes';

describe('getDefaultWorldConfig', () => {
  it('should return a valid WorldStatisticsConfig', () => {
    const config = getDefaultWorldConfig();

    expect(config).toBeDefined();
    expect(config.statistics).toBeDefined();
    expect(config.statistics?.resources).toBeInstanceOf(Array);
    expect(config.statistics?.passiveScores).toBeInstanceOf(Array);
  });

  it('should include all default resource definitions', () => {
    const config = getDefaultWorldConfig();
    const resourceIds = config.statistics?.resources?.map((r) => r.id) ?? [];

    expect(resourceIds).toContain('hp');
    expect(resourceIds).toContain('mp');
    expect(resourceIds).toContain('ac');
    expect(resourceIds).toContain('spd');
    expect(resourceIds).toContain('ap');
  });

  it('should include all default passive score definitions', () => {
    const config = getDefaultWorldConfig();
    const passiveScoreIds = config.statistics?.passiveScores?.map((ps) => ps.id) ?? [];

    expect(passiveScoreIds).toContain('str');
    expect(passiveScoreIds).toContain('dex');
    expect(passiveScoreIds).toContain('con');
    expect(passiveScoreIds).toContain('int');
    expect(passiveScoreIds).toContain('wis');
    expect(passiveScoreIds).toContain('cha');
    expect(passiveScoreIds).toContain('pb');
  });

  it('should set isDefault=true for all default statistics', () => {
    const config = getDefaultWorldConfig();

    // All default resources should have isDefault: true
    const allResourcesDefault = config.statistics?.resources?.every(
      (r: ResourceStatisticDefinition) => r.isDefault === true,
    );
    expect(allResourcesDefault).toBe(true);

    // All default passive scores should have isDefault: true
    const allPassiveScoresDefault = config.statistics?.passiveScores?.every(
      (ps: PassiveScoreDefinition) => ps.isDefault === true,
    );
    expect(allPassiveScoresDefault).toBe(true);
  });

  it('should match DEFAULT_RESOURCE_DEFINITIONS and DEFAULT_PASSIVE_SCORE_DEFINITIONS', () => {
    const config = getDefaultWorldConfig();

    expect(config.statistics?.resources).toEqual(DEFAULT_RESOURCE_DEFINITIONS);
    expect(config.statistics?.passiveScores).toEqual(
      DEFAULT_PASSIVE_SCORE_DEFINITIONS,
    );
  });

  it('should return a new object each time (not a singleton)', () => {
    const config1 = getDefaultWorldConfig();
    const config2 = getDefaultWorldConfig();

    expect(config1).toEqual(config2);
    expect(config1).not.toBe(config2);
    expect(config1.statistics).not.toBe(config2.statistics);
  });
});
