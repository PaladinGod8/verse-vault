export function formatPlannedAt(plannedAt: string | null): string {
  if (!plannedAt) {
    return '-';
  }

  const normalized = plannedAt.includes('T')
    ? plannedAt
    : `${plannedAt.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return plannedAt;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}
