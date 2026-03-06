import { describe, it, expect } from 'vitest';
import {
  calculateAbilityModifier,
  calculateSaveModifier,
  formatModifier,
  isResourceValueValid,
  clampResourceValue,
  isPassiveScoreValid,
  validateResourceStatistic,
  validatePassiveScoreDefinition,
} from '../../src/renderer/lib/statisticsCalculations';

describe('statisticsCalculations', () => {
  describe('calculateAbilityModifier', () => {
    it('calculates standard D&D 5e modifiers', () => {
      expect(calculateAbilityModifier(10)).toBe(0);
      expect(calculateAbilityModifier(18)).toBe(4);
      expect(calculateAbilityModifier(8)).toBe(-1);
      expect(calculateAbilityModifier(20)).toBe(5);
      expect(calculateAbilityModifier(1)).toBe(-5);
    });

    it('returns 0 for non-finite values', () => {
      expect(calculateAbilityModifier(NaN)).toBe(0);
      expect(calculateAbilityModifier(Infinity)).toBe(0);
    });
  });

  describe('calculateSaveModifier', () => {
    it('calculates save modifiers', () => {
      expect(calculateSaveModifier(10)).toBe(0);
      expect(calculateSaveModifier(15)).toBe(2);
      expect(calculateSaveModifier(8)).toBe(-1);
    });

    it('returns 0 for non-finite values', () => {
      expect(calculateSaveModifier(NaN)).toBe(0);
      expect(calculateSaveModifier(Infinity)).toBe(0);
    });
  });

  describe('formatModifier', () => {
    it('formats positive modifiers with plus sign', () => {
      expect(formatModifier(3)).toBe('+3');
      expect(formatModifier(0)).toBe('+0');
    });

    it('formats negative modifiers with minus sign', () => {
      expect(formatModifier(-2)).toBe('-2');
      expect(formatModifier(-5)).toBe('-5');
    });

    it('returns +0 for non-finite values', () => {
      expect(formatModifier(NaN)).toBe('+0');
      expect(formatModifier(Infinity)).toBe('+0');
    });
  });

  describe('Validation', () => {
    describe('isResourceValueValid', () => {
      it('returns true for valid resource values', () => {
        expect(isResourceValueValid(5, 10)).toBe(true);
        expect(isResourceValueValid(0, 0)).toBe(true);
        expect(isResourceValueValid(10, 10)).toBe(true);
      });

      it('returns false when current exceeds maximum', () => {
        expect(isResourceValueValid(11, 10)).toBe(false);
      });

      it('returns false for negative values', () => {
        expect(isResourceValueValid(-1, 10)).toBe(false);
        expect(isResourceValueValid(5, -10)).toBe(false);
      });

      it('returns false for non-finite values', () => {
        expect(isResourceValueValid(NaN, 10)).toBe(false);
        expect(isResourceValueValid(5, NaN)).toBe(false);
        expect(isResourceValueValid(Infinity, 10)).toBe(false);
      });
    });

    describe('clampResourceValue', () => {
      it('clamps current to maximum', () => {
        expect(clampResourceValue(15, 10)).toBe(10);
      });

      it('clamps negative to zero', () => {
        expect(clampResourceValue(-5, 10)).toBe(0);
      });

      it('leaves valid values unchanged', () => {
        expect(clampResourceValue(5, 10)).toBe(5);
      });

      it('returns 0 for non-finite values', () => {
        expect(clampResourceValue(NaN, 10)).toBe(0);
        expect(clampResourceValue(5, NaN)).toBe(0);
      });
    });

    describe('isPassiveScoreValid', () => {
      it('returns true for valid range 0-99', () => {
        expect(isPassiveScoreValid(0)).toBe(true);
        expect(isPassiveScoreValid(10)).toBe(true);
        expect(isPassiveScoreValid(30)).toBe(true);
        expect(isPassiveScoreValid(99)).toBe(true);
      });

      it('returns false for values outside range', () => {
        expect(isPassiveScoreValid(-1)).toBe(false);
        expect(isPassiveScoreValid(100)).toBe(false);
        expect(isPassiveScoreValid(150)).toBe(false);
      });
    });

    describe('validateResourceStatistic', () => {
      it('returns null for valid definition', () => {
        const def = {
          id: 'hp',
          name: 'Hit Points',
          abbreviation: 'HP',
        };
        expect(validateResourceStatistic(def)).toBe(null);
      });

      it('validates ID presence', () => {
        const def = {
          id: '',
          name: 'Hit Points',
          abbreviation: 'HP',
        };
        expect(validateResourceStatistic(def)).toContain('ID is required');
      });

      it('validates name presence', () => {
        const def = {
          id: 'hp',
          name: '',
          abbreviation: 'HP',
        };
        expect(validateResourceStatistic(def)).toContain('name is required');
      });

      it('validates abbreviation presence', () => {
        const def = {
          id: 'hp',
          name: 'Hit Points',
          abbreviation: '',
        };
        expect(validateResourceStatistic(def)).toContain(
          'abbreviation is required',
        );
      });

      it('validates abbreviation length', () => {
        const def = {
          id: 'hp',
          name: 'Hit Points',
          abbreviation: 'HITPOINTS',
        };
        expect(validateResourceStatistic(def)).toContain(
          '5 characters or fewer',
        );
      });
    });

    describe('validatePassiveScoreDefinition', () => {
      it('returns null for valid definition', () => {
        const def = {
          id: 'str',
          name: 'Strength',
          abbreviation: 'STR',
          type: 'ability_score',
        };
        expect(validatePassiveScoreDefinition(def)).toBe(null);
      });

      it('validates ID presence', () => {
        const def = {
          id: '',
          name: 'Strength',
          abbreviation: 'STR',
          type: 'ability_score',
        };
        expect(validatePassiveScoreDefinition(def)).toContain('ID is required');
      });

      it('validates name presence', () => {
        const def = {
          id: 'str',
          name: '',
          abbreviation: 'STR',
          type: 'ability_score',
        };
        expect(validatePassiveScoreDefinition(def)).toContain(
          'name is required',
        );
      });

      it('validates abbreviation presence', () => {
        const def = {
          id: 'str',
          name: 'Strength',
          abbreviation: '',
          type: 'ability_score',
        };
        expect(validatePassiveScoreDefinition(def)).toContain(
          'abbreviation is required',
        );
      });

      it('validates abbreviation length', () => {
        const def = {
          id: 'str',
          name: 'Strength',
          abbreviation: 'STRENGTH',
          type: 'ability_score',
        };
        expect(validatePassiveScoreDefinition(def)).toContain(
          '5 characters or fewer',
        );
      });

      it('validates type', () => {
        const def = {
          id: 'str',
          name: 'Strength',
          abbreviation: 'STR',
          type: 'invalid_type',
        };
        expect(validatePassiveScoreDefinition(def)).toContain(
          'Invalid passive score type',
        );
      });

      it('accepts proficiency_bonus type', () => {
        const def = {
          id: 'pb',
          name: 'Proficiency Bonus',
          abbreviation: 'PB',
          type: 'proficiency_bonus',
        };
        expect(validatePassiveScoreDefinition(def)).toBe(null);
      });
    });
  });
});
