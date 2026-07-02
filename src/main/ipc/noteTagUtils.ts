export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seenByLowerCase = new Map<string, string>();
  for (const raw of tags) {
    if (typeof raw !== 'string') {
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (!seenByLowerCase.has(key)) {
      seenByLowerCase.set(key, trimmed);
    }
  }

  return [...seenByLowerCase.values()];
}
