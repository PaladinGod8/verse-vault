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

export function flattenCharacterForSearch(character: Character): string {
  const parts: string[] = [];
  collectLeafStrings(character.name, parts);
  collectLeafStrings(character.profile, parts);
  collectLeafStrings(parseJsonSafely(character.sections), parts);
  collectLeafStrings(parseJsonSafely(character.wiki_summary), parts);
  return parts.join(' ').toLowerCase();
}

export function characterMatchesQuery(character: Character, query: string): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return true;
  }
  return flattenCharacterForSearch(character).includes(trimmedQuery);
}
