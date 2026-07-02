function parseLoreNoteQuery(query: string): { textTokens: string[]; tagTokens: string[]; } {
  const textTokens: string[] = [];
  const tagTokens: string[] = [];

  for (const rawToken of query.trim().split(/\s+/)) {
    if (!rawToken) continue;
    if (rawToken.startsWith('#')) {
      const tag = rawToken.slice(1).toLowerCase();
      if (tag) tagTokens.push(tag);
    } else {
      textTokens.push(rawToken.toLowerCase());
    }
  }

  return { textTokens, tagTokens };
}

function flattenLoreNoteForTextSearch(note: LoreNote): string {
  const parts = [note.name];
  if (note.content) parts.push(note.content);
  return parts.join(' ').toLowerCase();
}

export function loreNoteMatchesQuery(note: LoreNote, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return true;
  }

  const { textTokens, tagTokens } = parseLoreNoteQuery(trimmedQuery);
  const searchBlob = flattenLoreNoteForTextSearch(note);
  const lowerCaseTags = note.tags.map((tag) => tag.toLowerCase());

  const textMatches = textTokens.every((token) => searchBlob.includes(token));
  const tagMatches = tagTokens.every((token) => lowerCaseTags.includes(token));

  return textMatches && tagMatches;
}
