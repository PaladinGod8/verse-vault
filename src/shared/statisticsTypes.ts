// World-level statistics configuration types

export type ResourceStatisticDefinition = {
  id: string; // Unique identifier, e.g., 'hp', 'mp', 'ac'
  name: string; // Display name, e.g., 'Hit Points'
  abbreviation: string; // Short form, e.g., 'HP'
  description?: string; // Optional description
  isDefault: boolean; // Whether to include in new statblocks automatically
};

export type PassiveScoreType = 'ability_score' | 'proficiency_bonus' | 'custom';

export type PassiveScoreDefinition = {
  id: string; // Unique identifier, e.g., 'str', 'pb'
  name: string; // Display name, e.g., 'Strength', 'Proficiency Bonus'
  abbreviation: string; // Short form, e.g., 'STR', 'PB'
  description?: string; // Optional description
  type: PassiveScoreType;
  isDefault: boolean; // Whether to include in new statblocks automatically
};

export type WorldStatisticsConfig = {
  statistics?: {
    resources?: ResourceStatisticDefinition[];
    passiveScores?: PassiveScoreDefinition[];
  };
};

// StatBlock-level statistics storage types

export type StatBlockResourceValue = {
  current: number;
  maximum: number;
};

export type StatBlockPassiveScoreValue = {
  baseValue: number;
  saveDC?: number; // For ability scores; calculated or overridden
  saveModifier?: number; // Calculated from saveDC
  abilityModifier?: number; // Calculated from baseValue
};

export type StatBlockStatisticsConfig = {
  statistics?: {
    resources?: Record<string, StatBlockResourceValue>; // keyed by resource id
    passiveScores?: Record<string, StatBlockPassiveScoreValue>; // keyed by passive score id
  };
};

// Helper type guards

export function isResourceDefinition(
  obj: unknown,
): obj is ResourceStatisticDefinition {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.abbreviation === 'string' &&
    typeof record.isDefault === 'boolean'
  );
}

export function isPassiveScoreDefinition(
  obj: unknown,
): obj is PassiveScoreDefinition {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.abbreviation === 'string' &&
    typeof record.type === 'string' &&
    ['ability_score', 'proficiency_bonus', 'custom'].includes(record.type) &&
    typeof record.isDefault === 'boolean'
  );
}

export function isResourceValue(obj: unknown): obj is StatBlockResourceValue {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return (
    typeof record.current === 'number' &&
    typeof record.maximum === 'number' &&
    Number.isFinite(record.current) &&
    Number.isFinite(record.maximum)
  );
}

export function isPassiveScoreValue(
  obj: unknown,
): obj is StatBlockPassiveScoreValue {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return (
    typeof record.baseValue === 'number' && Number.isFinite(record.baseValue)
  );
}

// Default statistics for new worlds

export const DEFAULT_RESOURCE_DEFINITIONS: ResourceStatisticDefinition[] = [
  {
    id: 'hp',
    name: 'Hit Points',
    abbreviation: 'HP',
    description: 'Describes the health of a character',
    isDefault: true,
  },
  {
    id: 'mp',
    name: 'Mana Points',
    abbreviation: 'MP',
    description: 'Resource for using mana, replenishes on long rest',
    isDefault: true,
  },
  {
    id: 'ac',
    name: 'Armour Class',
    abbreviation: 'AC',
    description: 'Overall protection from attacks',
    isDefault: true,
  },
  {
    id: 'spd',
    name: 'Movement Speed',
    abbreviation: 'SPD',
    description: 'Number of tiles that can be moved in combat per round',
    isDefault: true,
  },
  {
    id: 'ap',
    name: 'Action Points',
    abbreviation: 'AP',
    description: 'Number of actions in combat per round',
    isDefault: true,
  },
  {
    id: 'sum',
    name: 'Summoning Slots',
    abbreviation: 'SUM',
    description: 'Maximum slots for controlled summoned tokens',
    isDefault: true,
  },
  {
    id: 'rsum',
    name: 'Summoning Range',
    abbreviation: 'rSUM',
    description: 'Maximum radius of summoning circle',
    isDefault: true,
  },
  {
    id: 'lvl',
    name: 'Overall Level',
    abbreviation: 'LVL',
    description: 'Aggregated level indicating overall power',
    isDefault: true,
  },
];

export const DEFAULT_PASSIVE_SCORE_DEFINITIONS: PassiveScoreDefinition[] = [
  {
    id: 'str',
    name: 'Strength',
    abbreviation: 'STR',
    type: 'ability_score',
    isDefault: true,
  },
  {
    id: 'dex',
    name: 'Dexterity',
    abbreviation: 'DEX',
    type: 'ability_score',
    isDefault: true,
  },
  {
    id: 'con',
    name: 'Constitution',
    abbreviation: 'CON',
    type: 'ability_score',
    isDefault: true,
  },
  {
    id: 'int',
    name: 'Intelligence',
    abbreviation: 'INT',
    type: 'ability_score',
    isDefault: true,
  },
  {
    id: 'wis',
    name: 'Wisdom',
    abbreviation: 'WIS',
    type: 'ability_score',
    isDefault: true,
  },
  {
    id: 'cha',
    name: 'Charisma',
    abbreviation: 'CHA',
    type: 'ability_score',
    isDefault: true,
  },
  {
    id: 'pb',
    name: 'Proficiency Bonus',
    abbreviation: 'PB',
    type: 'proficiency_bonus',
    description: 'Generic value added to proficient rolls',
    isDefault: true,
  },
];
