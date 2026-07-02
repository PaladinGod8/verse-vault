function parseCampaignNoteQuery(query: string): { textTokens: string[]; tagTokens: string[]; } {
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

export function campaignNoteMatchesQuery(note: CampaignNote, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return true;
  }

  const { textTokens, tagTokens } = parseCampaignNoteQuery(trimmedQuery);
  const lowerCaseName = note.name.toLowerCase();
  const lowerCaseTags = note.tags.map((tag) => tag.toLowerCase());

  const textMatches = textTokens.every((token) => lowerCaseName.includes(token));
  const tagMatches = tagTokens.every((token) => lowerCaseTags.includes(token));

  return textMatches && tagMatches;
}
