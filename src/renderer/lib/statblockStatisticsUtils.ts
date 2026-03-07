import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
  StatBlockPassiveScoreValue,
  StatBlockResourceValue,
  StatBlockStatisticsConfig,
} from '../../shared/statisticsTypes';
import { isPassiveScoreValue, isResourceValue } from '../../shared/statisticsTypes';

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSkills(skills: StatBlockSkillValue[]): StatBlockSkillValue[] {
  const deduped = new Map<string, StatBlockSkillValue>();

  skills.forEach((skill) => {
    const key = typeof skill.key === 'string' ? skill.key.trim() : '';
    if (!key || typeof skill.rank !== 'number' || !Number.isFinite(skill.rank)) {
      return;
    }

    deduped.set(key, {
      key,
      rank: skill.rank,
    });
  });

  return [...deduped.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Parse statblock config and extract statistics.
 * Returns empty statistics structure if parsing fails.
 */
export function parseStatBlockStatistics(
  configJson: string,
): StatBlockStatisticsConfig {
  const config = parseStatBlockConfigObject(configJson);
  const statistics = isJsonObject(config.statistics) ? config.statistics : {};

  const resources = isJsonObject(statistics.resources) ? statistics.resources : {};
  const passiveScores = isJsonObject(statistics.passiveScores)
    ? statistics.passiveScores
    : {};

  return {
    statistics: {
      resources: resources as Record<string, StatBlockResourceValue>,
      passiveScores: passiveScores as Record<string, StatBlockPassiveScoreValue>,
    },
  };
}

/**
 * Get a resource value from statblock config.
 */
export function getResourceValue(
  config: StatBlockStatisticsConfig,
  resourceId: string,
): StatBlockResourceValue | null {
  const value = config.statistics?.resources?.[resourceId];
  return value && isResourceValue(value) ? value : null;
}

/**
 * Get a passive score value from statblock config.
 */
export function getPassiveScoreValue(
  config: StatBlockStatisticsConfig,
  passiveScoreId: string,
): StatBlockPassiveScoreValue | null {
  const value = config.statistics?.passiveScores?.[passiveScoreId];
  return value && isPassiveScoreValue(value) ? value : null;
}

/**
 * Set a resource value in statblock config.
 * Returns new config object (immutable update).
 */
export function setResourceValue(
  config: StatBlockStatisticsConfig,
  resourceId: string,
  value: StatBlockResourceValue,
): StatBlockStatisticsConfig {
  return {
    ...config,
    statistics: {
      ...config.statistics,
      resources: {
        ...config.statistics?.resources,
        [resourceId]: value,
      },
    },
  };
}

/**
 * Set a passive score value in statblock config.
 * Returns new config object (immutable update).
 */
export function setPassiveScoreValue(
  config: StatBlockStatisticsConfig,
  passiveScoreId: string,
  value: StatBlockPassiveScoreValue,
): StatBlockStatisticsConfig {
  return {
    ...config,
    statistics: {
      ...config.statistics,
      passiveScores: {
        ...config.statistics?.passiveScores,
        [passiveScoreId]: value,
      },
    },
  };
}

/**
 * Initialize statblock statistics from world definitions.
 * Only includes resources/passive scores with isDefault: true.
 */
export function initializeStatBlockStatistics(
  worldResources: ResourceStatisticDefinition[],
  worldPassiveScores: PassiveScoreDefinition[],
): StatBlockStatisticsConfig {
  const resources: Record<string, StatBlockResourceValue> = {};
  const passiveScores: Record<string, StatBlockPassiveScoreValue> = {};

  // Initialize default resources with 0/0
  worldResources
    .filter((r) => r.isDefault)
    .forEach((r) => {
      resources[r.id] = { current: 0, maximum: 0 };
    });

  // Initialize default passive scores with base value 10
  worldPassiveScores
    .filter((ps) => ps.isDefault)
    .forEach((ps) => {
      passiveScores[ps.id] = { baseValue: 10 };
    });

  return {
    statistics: {
      resources,
      passiveScores,
    },
  };
}

/**
 * Serialize statblock statistics config to JSON string.
 */
export function serializeStatBlockStatistics(
  config: StatBlockStatisticsConfig,
): string {
  return JSON.stringify(config);
}

/**
 * Parse statblock config to a JSON object. Returns {} on parse failure.
 */
export function parseStatBlockConfigObject(configJson: string): JsonObject {
  try {
    const parsed = JSON.parse(configJson);
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Parse and sanitize skills from statblock config.
 */
export function parseStatBlockSkills(configJson: string): StatBlockSkillValue[] {
  const config = parseStatBlockConfigObject(configJson);
  if (!Array.isArray(config.skills)) {
    return [];
  }

  const parsedSkills = config.skills
    .filter((entry) => isJsonObject(entry))
    .map((entry) => ({
      key: typeof entry.key === 'string' ? entry.key : '',
      rank: typeof entry.rank === 'number' ? entry.rank : Number.NaN,
    }));

  return normalizeSkills(parsedSkills);
}

/**
 * Merge editor-managed sections back into the statblock config JSON.
 */
export function serializeStatBlockEditorConfig(params: {
  baseConfig: JsonObject;
  statistics: StatBlockStatisticsConfig | null;
  skills: StatBlockSkillValue[];
}): string {
  const nextConfig: JsonObject = { ...params.baseConfig };

  delete nextConfig.statistics;
  delete nextConfig.skills;

  const resources = params.statistics?.statistics?.resources ?? {};
  const passiveScores = params.statistics?.statistics?.passiveScores ?? {};

  if (Object.keys(resources).length > 0 || Object.keys(passiveScores).length > 0) {
    nextConfig.statistics = {
      resources,
      passiveScores,
    };
  }

  const normalizedSkills = normalizeSkills(params.skills);
  if (normalizedSkills.length > 0) {
    nextConfig.skills = normalizedSkills;
  }

  return JSON.stringify(nextConfig);
}
