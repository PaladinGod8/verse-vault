import type {
  StatBlockStatisticsConfig,
  StatBlockResourceValue,
  StatBlockPassiveScoreValue,
  ResourceStatisticDefinition,
  PassiveScoreDefinition,
} from '../../shared/statisticsTypes';
import {
  isResourceValue,
  isPassiveScoreValue,
} from '../../shared/statisticsTypes';

/**
 * Parse statblock config and extract statistics.
 * Returns empty statistics structure if parsing fails.
 */
export function parseStatBlockStatistics(
  configJson: string,
): StatBlockStatisticsConfig {
  try {
    const config: StatBlockStatisticsConfig = JSON.parse(configJson);
    return {
      statistics: {
        resources: config.statistics?.resources ?? {},
        passiveScores: config.statistics?.passiveScores ?? {},
      },
    };
  } catch {
    return {
      statistics: {
        resources: {},
        passiveScores: {},
      },
    };
  }
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
