/**
 * Calculate ability modifier from an ability score.
 * Uses the standard D&D 5e formula: floor((score - 10) / 2)
 *
 * @param score - The ability score value
 * @returns The calculated modifier
 *
 * @example
 * calculateAbilityModifier(10) // returns 0
 * calculateAbilityModifier(18) // returns 4
 * calculateAbilityModifier(8)  // returns -1
 */
export function calculateAbilityModifier(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate saving throw modifier from a save DC score.
 * Uses the same formula as ability modifiers: floor((score - 10) / 2)
 *
 * @param saveDC - The saving throw DC value
 * @returns The calculated save modifier
 */
export function calculateSaveModifier(saveDC: number): number {
  if (!Number.isFinite(saveDC)) {
    return 0;
  }
  return Math.floor((saveDC - 10) / 2);
}

/**
 * Format a modifier for display (includes + or - sign).
 *
 * @param modifier - The modifier value
 * @returns Formatted string like "+2" or "-1"
 *
 * @example
 * formatModifier(3)  // returns "+3"
 * formatModifier(-2) // returns "-2"
 * formatModifier(0)  // returns "+0"
 */
export function formatModifier(modifier: number): string {
  if (!Number.isFinite(modifier)) {
    return '+0';
  }
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Validate that a resource's current value does not exceed maximum.
 *
 * @param current - Current resource value
 * @param maximum - Maximum resource value
 * @returns True if current <= maximum, false otherwise
 */
export function isResourceValueValid(
  current: number,
  maximum: number,
): boolean {
  if (!Number.isFinite(current) || !Number.isFinite(maximum)) {
    return false;
  }
  return current <= maximum && current >= 0 && maximum >= 0;
}

/**
 * Clamp a resource's current value to valid range [0, maximum].
 *
 * @param current - Current resource value
 * @param maximum - Maximum resource value
 * @returns Clamped current value
 */
export function clampResourceValue(current: number, maximum: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(maximum)) {
    return 0;
  }
  return Math.max(0, Math.min(current, maximum));
}
