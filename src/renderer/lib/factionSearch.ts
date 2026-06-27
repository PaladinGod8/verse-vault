import { getAncestorIds } from '../../shared/factionHierarchy';

function collectLeafStrings(value: unknown, out: string[]): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === 'string') {
    if (value.trim()) {
      out.push(value);
    }
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectLeafStrings(item, out);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectLeafStrings(nested, out);
    }
  }
}

function parseJsonSafely(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function flattenFactionForSearch(faction: Faction): string {
  const parts: string[] = [];
  collectLeafStrings(faction.name, parts);
  collectLeafStrings(faction.profile, parts);
  collectLeafStrings(parseJsonSafely(faction.sections), parts);
  collectLeafStrings(parseJsonSafely(faction.wiki_summary), parts);
  return parts.join(' ').toLowerCase();
}

export function factionMatchesQuery(
  faction: Faction,
  query: string,
  allFactions: Faction[],
): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return true;
  }

  if (flattenFactionForSearch(faction).includes(trimmedQuery)) {
    return true;
  }

  const exactMatchFaction = allFactions.find(
    (candidate) => candidate.name.trim().toLowerCase() === trimmedQuery,
  );
  if (!exactMatchFaction) {
    return false;
  }

  const ancestorIds = getAncestorIds(faction.id, allFactions);
  return ancestorIds.includes(exactMatchFaction.id);
}
