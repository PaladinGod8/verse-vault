/**
 * Parses a route param string into a positive integer id, or null if missing/invalid.
 * Shared by pages that validate `:id`/`:campaignId`/`:arcId`-style route params before fetching.
 */
export function parsePositiveIntParam(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
