// Faction JSON-shape types: fixed text sections and the standardized wiki summary.

export interface FactionSections {
  history?: string | null;
  goalsMotives?: string | null;
  relationships?: string | null;
  notes?: string | null;
}

export interface FactionWikiSummary {
  status?: string | null;
  ipaPronunciation?: string | null;
  headquarters?: string | null;
  currentTotalMembers?: string | null;
  founded?: string | null;
  disbanded?: string | null;
  aliases?: string[];
  locations?: string[];
}

export function getDefaultFactionSections(): FactionSections {
  return {};
}

export function getDefaultFactionWikiSummary(): FactionWikiSummary {
  return {};
}
