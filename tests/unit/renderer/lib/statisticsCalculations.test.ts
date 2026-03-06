import { describe, it, expect } from 'vitest';
import {
  calculateAbilityModifier,
  calculateSaveModifier,
  formatModifier,
  isResourceValueValid,
  clampResourceValue,
} from '../../../../src/renderer/lib/statisticsCalculations';

describe('statisticsCalculations', () => {
  describe('calculateAbilityModifier', () => {
    it('should return 0 for ability score of 10', () => {
      expect(calculateAbilityModifier(10)).toBe(0);
    });

    it('should return 0 for ability score of 11', () => {
      expect(calculateAbilityModifier(11)).toBe(0);
    });

    it('should return +4 for ability score of 18', () => {
      expect(calculateAbilityModifier(18)).toBe(4);
    });

    it('should return +5 for ability score of 20', () => {
      expect(calculateAbilityModifier(20)).toBe(5);
    });

    it('should return -1 for ability score of 8', () => {
      expect(calculateAbilityModifier(8)).toBe(-1);
    });

    it('should return -5 for ability score of 1', () => {
      expect(calculateAbilityModifier(1)).toBe(-5);
    });

    it('should handle edge case of 0', () => {
      expect(calculateAbilityModifier(0)).toBe(-5);
    });

    it('should return 0 for NaN', () => {
      expect(calculateAbilityModifier(NaN)).toBe(0);
    });

    it('should return 0 for Infinity', () => {
      expect(calculateAbilityModifier(Infinity)).toBe(0);
    });
  });

  describe('calculateSaveModifier', () => {
    it('should use same formula as ability modifier', () => {
      expect(calculateSaveModifier(10)).toBe(0);
      expect(calculateSaveModifier(14)).toBe(2);
      expect(calculateSaveModifier(8)).toBe(-1);
    });

    it('should handle non-finite values', () => {
      expect(calculateSaveModifier(NaN)).toBe(0);
      expect(calculateSaveModifier(Infinity)).toBe(0);
    });
  });

  describe('formatModifier', () => {
    it('should format positive modifiers with + sign', () => {
      expect(formatModifier(3)).toBe('+3');
      expect(formatModifier(1)).toBe('+1');
    });

    it('should format negative modifiers with - sign', () => {
      expect(formatModifier(-2)).toBe('-2');
      expect(formatModifier(-1)).toBe('-1');
    });

    it('should format zero with + sign', () => {
      expect(formatModifier(0)).toBe('+0');
    });

    it('should handle non-finite values', () => {
      expect(formatModifier(NaN)).toBe('+0');
      expect(formatModifier(Infinity)).toBe('+0');
    });
  });

  describe('isResourceValueValid', () => {
    it('should return true when current <= maximum', () => {
      expect(isResourceValueValid(30, 50)).toBe(true);
      expect(isResourceValueValid(50, 50)).toBe(true);
      expect(isResourceValueValid(0, 100)).toBe(true);
    });

    it('should return false when current > maximum', () => {
      expect(isResourceValueValid(60, 50)).toBe(false);
    });

    it('should return false when current is negative', () => {
      expect(isResourceValueValid(-10, 50)).toBe(false);
    });

    it('should return false when maximum is negative', () => {
      expect(isResourceValueValid(10, -50)).toBe(false);
    });

    it('should return false for non-finite values', () => {
      expect(isResourceValueValid(NaN, 50)).toBe(false);
      expect(isResourceValueValid(30, NaN)).toBe(false);
      expect(isResourceValueValid(Infinity, 50)).toBe(false);
    });
  });

  describe('clampResourceValue', () => {
    it('should return current value when valid', () => {
      expect(clampResourceValue(30, 50)).toBe(30);
    });

    it('should clamp to maximum when current > maximum', () => {
      expect(clampResourceValue(60, 50)).toBe(50);
    });

    it('should clamp to 0 when current is negative', () => {
      expect(clampResourceValue(-10, 50)).toBe(0);
    });

    it('should return 0 for non-finite current', () => {
      expect(clampResourceValue(NaN, 50)).toBe(0);
      expect(clampResourceValue(Infinity, 50)).toBe(0);
    });

    it('should return 0 for non-finite maximum', () => {
      expect(clampResourceValue(30, NaN)).toBe(0);
      expect(clampResourceValue(30, Infinity)).toBe(0);
    });
  });
});
