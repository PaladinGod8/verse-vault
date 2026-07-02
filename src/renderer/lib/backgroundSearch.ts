function collectBackgroundStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    if (value.trim()) {
      out.push(value);
    }
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value));
  }
}

export function flattenBackgroundForSearch(background: Background): string {
  const parts: string[] = [];
  collectBackgroundStrings(background.name, parts);
  collectBackgroundStrings(background.description, parts);
  return parts.join(' ').toLowerCase();
}

export function backgroundMatchesQuery(background: Background, query: string): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return true;
  }

  return flattenBackgroundForSearch(background).includes(trimmedQuery);
}
