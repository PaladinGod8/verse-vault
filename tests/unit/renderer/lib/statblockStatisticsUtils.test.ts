import { describe, expect, it } from 'vitest';
import {
  getPassiveScoreValue,
  getResourceValue,
  initializeStatBlockStatistics,
  parseStatBlockStatistics,
  serializeStatBlockStatistics,
  setPassiveScoreValue,
  setResourceValue,
} from '../../../../src/renderer/lib/statblockStatisticsUtils';

describe('statblockStatisticsUtils', () => {
  describe('parseStatBlockStatistics', () => {
    it('should parse valid statblock config JSON', () => {
      const json = JSON.stringify({
        statistics: {
          resources: {
            hp: { current: 30, maximum: 50 },
          },
          passiveScores: {
            str: { baseValue: 16 },
          },
        },
      });

      const result = parseStatBlockStatistics(json);

      expect(result.statistics?.resources?.hp).toEqual({
        current: 30,
        maximum: 50,
      });
      expect(result.statistics?.passiveScores?.str).toEqual({
        baseValue: 16,
      });
    });

    it('should return empty structure for invalid JSON', () => {
      const result = parseStatBlockStatistics('invalid json');

      expect(result.statistics?.resources).toEqual({});
      expect(result.statistics?.passiveScores).toEqual({});
    });

    it('should handle empty statistics', () => {
      const result = parseStatBlockStatistics('{}');

      expect(result.statistics?.resources).toEqual({});
      expect(result.statistics?.passiveScores).toEqual({});
    });
  });

  describe('getResourceValue', () => {
    it('should return resource value when present', () => {
      const config = parseStatBlockStatistics(
        JSON.stringify({
          statistics: {
            resources: {
              hp: { current: 30, maximum: 50 },
            },
          },
        }),
      );

      const value = getResourceValue(config, 'hp');

      expect(value).toEqual({ current: 30, maximum: 50 });
    });

    it('should return null when resource not found', () => {
      const config = parseStatBlockStatistics('{}');

      const value = getResourceValue(config, 'hp');

      expect(value).toBeNull();
    });
  });

  describe('getPassiveScoreValue', () => {
    it('should return passive score value when present', () => {
      const config = parseStatBlockStatistics(
        JSON.stringify({
          statistics: {
            passiveScores: {
              str: { baseValue: 16 },
            },
          },
        }),
      );

      const value = getPassiveScoreValue(config, 'str');

      expect(value).toEqual({ baseValue: 16 });
    });

    it('should return null when passive score not found', () => {
      const config = parseStatBlockStatistics('{}');

      const value = getPassiveScoreValue(config, 'str');

      expect(value).toBeNull();
    });
  });

  describe('setResourceValue', () => {
    it('should set resource value immutably', () => {
      const config = parseStatBlockStatistics('{}');

      const updated = setResourceValue(config, 'hp', {
        current: 30,
        maximum: 50,
      });

      expect(updated.statistics?.resources?.hp).toEqual({
        current: 30,
        maximum: 50,
      });
      expect(config.statistics?.resources?.hp).toBeUndefined();
    });

    it('should preserve other resources when setting one', () => {
      const config = parseStatBlockStatistics(
        JSON.stringify({
          statistics: {
            resources: {
              hp: { current: 30, maximum: 50 },
              mp: { current: 10, maximum: 20 },
            },
          },
        }),
      );

      const updated = setResourceValue(config, 'hp', {
        current: 40,
        maximum: 50,
      });

      expect(updated.statistics?.resources?.hp?.current).toBe(40);
      expect(updated.statistics?.resources?.mp).toEqual({
        current: 10,
        maximum: 20,
      });
    });
  });

  describe('setPassiveScoreValue', () => {
    it('should set passive score value immutably', () => {
      const config = parseStatBlockStatistics('{}');

      const updated = setPassiveScoreValue(config, 'str', {
        baseValue: 16,
      });

      expect(updated.statistics?.passiveScores?.str).toEqual({
        baseValue: 16,
      });
      expect(config.statistics?.passiveScores?.str).toBeUndefined();
    });
  });

  describe('initializeStatBlockStatistics', () => {
    it('should initialize statistics from world definitions', () => {
      const resources = [
        { id: 'hp', name: 'HP', abbreviation: 'HP', isDefault: true },
        { id: 'mp', name: 'MP', abbreviation: 'MP', isDefault: false },
      ];
      const passiveScores = [
        {
          id: 'str',
          name: 'STR',
          abbreviation: 'STR',
          type: 'ability_score' as const,
          isDefault: true,
        },
        {
          id: 'dex',
          name: 'DEX',
          abbreviation: 'DEX',
          type: 'ability_score' as const,
          isDefault: false,
        },
      ];

      const config = initializeStatBlockStatistics(resources, passiveScores);

      expect(config.statistics?.resources?.hp).toEqual({
        current: 0,
        maximum: 0,
      });
      expect(config.statistics?.resources?.mp).toBeUndefined();
      expect(config.statistics?.passiveScores?.str).toEqual({
        baseValue: 10,
      });
      expect(config.statistics?.passiveScores?.dex).toBeUndefined();
    });

    it('should initialize empty when no defaults', () => {
      const config = initializeStatBlockStatistics([], []);

      expect(config.statistics?.resources).toEqual({});
      expect(config.statistics?.passiveScores).toEqual({});
    });
  });

  describe('serializeStatBlockStatistics', () => {
    it('should serialize config to JSON string', () => {
      const config = {
        statistics: {
          resources: {
            hp: { current: 30, maximum: 50 },
          },
          passiveScores: {
            str: { baseValue: 16 },
          },
        },
      };

      const json = serializeStatBlockStatistics(config);
      const parsed = JSON.parse(json);

      expect(parsed.statistics.resources.hp).toEqual({
        current: 30,
        maximum: 50,
      });
    });
  });
});
