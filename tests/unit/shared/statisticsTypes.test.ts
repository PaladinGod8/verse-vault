import { describe, expect, it } from 'vitest';
import {
  isPassiveScoreDefinition,
  isPassiveScoreValue,
  isResourceDefinition,
  isResourceValue,
  type PassiveScoreDefinition,
  type ResourceStatisticDefinition,
  type StatBlockPassiveScoreValue,
  type StatBlockResourceValue,
} from '../../../src/shared/statisticsTypes';

describe('statisticsTypes type guards', () => {
  describe('isResourceDefinition', () => {
    it('returns true for valid resource definition', () => {
      const valid: ResourceStatisticDefinition = {
        id: 'hp',
        name: 'Hit Points',
        abbreviation: 'HP',
        description: 'Health',
        isDefault: true,
      };
      expect(isResourceDefinition(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isResourceDefinition(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isResourceDefinition(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isResourceDefinition('string')).toBe(false);
      expect(isResourceDefinition(123)).toBe(false);
      expect(isResourceDefinition(true)).toBe(false);
    });

    it('returns false when id is missing', () => {
      expect(
        isResourceDefinition({
          name: 'Hit Points',
          abbreviation: 'HP',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(
        isResourceDefinition({
          id: 'hp',
          abbreviation: 'HP',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when abbreviation is missing', () => {
      expect(
        isResourceDefinition({
          id: 'hp',
          name: 'Hit Points',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when isDefault is missing', () => {
      expect(
        isResourceDefinition({
          id: 'hp',
          name: 'Hit Points',
          abbreviation: 'HP',
        }),
      ).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(
        isResourceDefinition({
          id: 123,
          name: 'Hit Points',
          abbreviation: 'HP',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when name is not a string', () => {
      expect(
        isResourceDefinition({
          id: 'hp',
          name: 123,
          abbreviation: 'HP',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when abbreviation is not a string', () => {
      expect(
        isResourceDefinition({
          id: 'hp',
          name: 'Hit Points',
          abbreviation: 123,
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when isDefault is not a boolean', () => {
      expect(
        isResourceDefinition({
          id: 'hp',
          name: 'Hit Points',
          abbreviation: 'HP',
          isDefault: 'true',
        }),
      ).toBe(false);
    });
  });

  describe('isPassiveScoreDefinition', () => {
    it('returns true for valid passive score definition with ability_score type', () => {
      const valid: PassiveScoreDefinition = {
        id: 'str',
        name: 'Strength',
        abbreviation: 'STR',
        type: 'ability_score',
        description: 'Physical power',
        isDefault: true,
      };
      expect(isPassiveScoreDefinition(valid)).toBe(true);
    });

    it('returns true for valid passive score definition with proficiency_bonus type', () => {
      const valid: PassiveScoreDefinition = {
        id: 'pb',
        name: 'Proficiency Bonus',
        abbreviation: 'PB',
        type: 'proficiency_bonus',
        isDefault: true,
      };
      expect(isPassiveScoreDefinition(valid)).toBe(true);
    });

    it('returns true for valid passive score definition with custom type', () => {
      const valid: PassiveScoreDefinition = {
        id: 'custom',
        name: 'Custom Score',
        abbreviation: 'CS',
        type: 'custom',
        isDefault: false,
      };
      expect(isPassiveScoreDefinition(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPassiveScoreDefinition(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPassiveScoreDefinition(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isPassiveScoreDefinition('string')).toBe(false);
      expect(isPassiveScoreDefinition(123)).toBe(false);
      expect(isPassiveScoreDefinition(true)).toBe(false);
    });

    it('returns false when id is missing', () => {
      expect(
        isPassiveScoreDefinition({
          name: 'Strength',
          abbreviation: 'STR',
          type: 'ability_score',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(
        isPassiveScoreDefinition({
          id: 'str',
          abbreviation: 'STR',
          type: 'ability_score',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when abbreviation is missing', () => {
      expect(
        isPassiveScoreDefinition({
          id: 'str',
          name: 'Strength',
          type: 'ability_score',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when type is missing', () => {
      expect(
        isPassiveScoreDefinition({
          id: 'str',
          name: 'Strength',
          abbreviation: 'STR',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when type is invalid', () => {
      expect(
        isPassiveScoreDefinition({
          id: 'str',
          name: 'Strength',
          abbreviation: 'STR',
          type: 'invalid_type',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when isDefault is missing', () => {
      expect(
        isPassiveScoreDefinition({
          id: 'str',
          name: 'Strength',
          abbreviation: 'STR',
          type: 'ability_score',
        }),
      ).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(
        isPassiveScoreDefinition({
          id: 123,
          name: 'Strength',
          abbreviation: 'STR',
          type: 'ability_score',
          isDefault: true,
        }),
      ).toBe(false);
    });

    it('returns false when type is not a string', () => {
      expect(
        isPassiveScoreDefinition({
          id: 'str',
          name: 'Strength',
          abbreviation: 'STR',
          type: 123,
          isDefault: true,
        }),
      ).toBe(false);
    });
  });

  describe('isResourceValue', () => {
    it('returns true for valid resource value', () => {
      const valid: StatBlockResourceValue = {
        current: 45,
        maximum: 60,
      };
      expect(isResourceValue(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isResourceValue(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isResourceValue(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isResourceValue('string')).toBe(false);
      expect(isResourceValue(123)).toBe(false);
    });

    it('returns false when current is missing', () => {
      expect(
        isResourceValue({
          id: 'hp',
          maximum: 60,
        }),
      ).toBe(false);
    });

    it('returns false when maximum is missing', () => {
      expect(
        isResourceValue({
          id: 'hp',
          current: 45,
        }),
      ).toBe(false);
    });

    it('returns false when current is not finite', () => {
      expect(
        isResourceValue({
          id: 'hp',
          current: NaN,
          maximum: 60,
        }),
      ).toBe(false);
    });

    it('returns false when maximum is not finite', () => {
      expect(
        isResourceValue({
          id: 'hp',
          current: 45,
          maximum: Infinity,
        }),
      ).toBe(false);
    });

    it('returns false when current is not a number', () => {
      expect(
        isResourceValue({
          id: 'hp',
          current: '45',
          maximum: 60,
        }),
      ).toBe(false);
    });

    it('returns false when maximum is not a number', () => {
      expect(
        isResourceValue({
          id: 'hp',
          current: 45,
          maximum: '60',
        }),
      ).toBe(false);
    });
  });

  describe('isPassiveScoreValue', () => {
    it('returns true for valid passive score value', () => {
      const valid: StatBlockPassiveScoreValue = {
        baseValue: 16,
        abilityModifier: 3,
        saveDC: 16,
        saveModifier: 3,
      };
      expect(isPassiveScoreValue(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPassiveScoreValue(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPassiveScoreValue(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isPassiveScoreValue('string')).toBe(false);
      expect(isPassiveScoreValue(123)).toBe(false);
    });

    it('returns false when baseValue is missing', () => {
      expect(
        isPassiveScoreValue({
          id: 'str',
          abilityModifier: 3,
        }),
      ).toBe(false);
    });

    it('returns false when baseValue is not finite', () => {
      expect(
        isPassiveScoreValue({
          id: 'str',
          baseValue: NaN,
        }),
      ).toBe(false);
    });

    it('returns false when baseValue is not a number', () => {
      expect(
        isPassiveScoreValue({
          id: 'str',
          baseValue: '16',
        }),
      ).toBe(false);
    });

    it('returns true when only baseValue is present', () => {
      expect(
        isPassiveScoreValue({
          id: 'str',
          baseValue: 10,
        }),
      ).toBe(true);
    });
  });
});
