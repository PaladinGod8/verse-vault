import type { WorldStatisticsConfig } from '../../shared/statisticsTypes';

export function parseWorldStatisticsConfig(rawConfig: string): WorldStatisticsConfig {
  try {
    const parsed = JSON.parse(rawConfig) as WorldStatisticsConfig;

    return {
      ...parsed,
      statistics: {
        ...parsed.statistics,
        resources: parsed.statistics?.resources ?? [],
        passiveScores: parsed.statistics?.passiveScores ?? [],
      },
    };
  } catch {
    return {
      statistics: {
        resources: [],
        passiveScores: [],
      },
    };
  }
}

/**
 * Replaces one statistics list (resources or passiveScores) in a world's config and persists
 * the result via `window.db.worlds.update`. Centralizes the read-merge-write pattern shared by
 * every create/update/delete handler on the statistics config page.
 */
export async function saveWorldStatisticsList<K extends 'resources' | 'passiveScores'>(
  world: World,
  key: K,
  updatedList: WorldStatisticsConfig['statistics'][K],
): Promise<World> {
  const config = parseWorldStatisticsConfig(world.config);
  const updatedConfig: WorldStatisticsConfig = {
    ...config,
    statistics: {
      ...config.statistics,
      [key]: updatedList,
    },
  };

  return window.db.worlds.update(world.id, {
    config: JSON.stringify(updatedConfig),
  });
}
