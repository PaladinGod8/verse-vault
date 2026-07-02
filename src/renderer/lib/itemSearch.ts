function collectItemStrings(value: unknown, out: string[]): void {
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

export function flattenItemForSearch(item: Item): string {
  const parts: string[] = [];
  collectItemStrings(item.name, parts);
  collectItemStrings(item.description, parts);
  return parts.join(' ').toLowerCase();
}

export function itemMatchesQuery(item: Item, query: string): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return true;
  }

  return flattenItemForSearch(item).includes(trimmedQuery);
}
