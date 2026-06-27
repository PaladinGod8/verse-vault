export type FactionHierarchyNode = {
  id: number;
  parent_faction_id: number | null;
};

export function getAncestorIds(
  factionId: number,
  allFactions: FactionHierarchyNode[],
): number[] {
  const byId = new Map(allFactions.map((faction) => [faction.id, faction]));
  const ancestorIds: number[] = [];
  const visited = new Set<number>([factionId]);

  let currentId = byId.get(factionId)?.parent_faction_id ?? null;
  while (currentId !== null && !visited.has(currentId)) {
    visited.add(currentId);
    ancestorIds.push(currentId);
    currentId = byId.get(currentId)?.parent_faction_id ?? null;
  }

  return ancestorIds;
}

export function getDescendantIds(
  factionId: number,
  allFactions: FactionHierarchyNode[],
): number[] {
  const childrenByParentId = new Map<number, number[]>();
  for (const faction of allFactions) {
    if (faction.parent_faction_id === null) {
      continue;
    }
    const siblings = childrenByParentId.get(faction.parent_faction_id) ?? [];
    siblings.push(faction.id);
    childrenByParentId.set(faction.parent_faction_id, siblings);
  }

  const descendantIds: number[] = [];
  const visited = new Set<number>([factionId]);
  const queue = [...(childrenByParentId.get(factionId) ?? [])];

  while (queue.length > 0) {
    const currentId = queue.shift() as number;
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);
    descendantIds.push(currentId);
    queue.push(...(childrenByParentId.get(currentId) ?? []));
  }

  return descendantIds;
}

export function wouldCreateCycle(
  factionId: number,
  candidateParentId: number | null,
  allFactions: FactionHierarchyNode[],
): boolean {
  if (candidateParentId === null) {
    return false;
  }
  if (candidateParentId === factionId) {
    return true;
  }
  return getAncestorIds(candidateParentId, allFactions).includes(factionId);
}
