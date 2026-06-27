import { describe, expect, it } from 'vitest';
import {
  getAncestorIds,
  getDescendantIds,
  wouldCreateCycle,
} from '../../../src/shared/factionHierarchy';

type HierarchyNode = { id: number; parent_faction_id: number | null; };

describe('factionHierarchy', () => {
  // Tree:
  //   1 (root)
  //   └─ 2
  //      └─ 3
  //         └─ 4
  //   5 (root, disconnected from 1-4)
  //   └─ 6
  const tree: HierarchyNode[] = [
    { id: 1, parent_faction_id: null },
    { id: 2, parent_faction_id: 1 },
    { id: 3, parent_faction_id: 2 },
    { id: 4, parent_faction_id: 3 },
    { id: 5, parent_faction_id: null },
    { id: 6, parent_faction_id: 5 },
  ];

  describe('getAncestorIds', () => {
    it('returns the full ancestor chain in order from nearest to furthest', () => {
      expect(getAncestorIds(4, tree)).toEqual([3, 2, 1]);
    });

    it('returns an empty array for a top-level faction', () => {
      expect(getAncestorIds(1, tree)).toEqual([]);
    });

    it('does not cross into a disconnected subtree', () => {
      expect(getAncestorIds(6, tree)).toEqual([5]);
      expect(getAncestorIds(6, tree)).not.toContain(1);
    });

    it('does not infinite-loop on a malformed pre-existing cycle in the data', () => {
      const corrupted: HierarchyNode[] = [
        { id: 10, parent_faction_id: 11 },
        { id: 11, parent_faction_id: 12 },
        { id: 12, parent_faction_id: 10 }, // cycle: 10 -> 11 -> 12 -> 10
      ];
      const result = getAncestorIds(10, corrupted);
      expect(result.length).toBeLessThanOrEqual(corrupted.length);
    });
  });

  describe('getDescendantIds', () => {
    it('returns all descendants regardless of depth', () => {
      expect(getDescendantIds(1, tree).sort()).toEqual([2, 3, 4]);
    });

    it('returns an empty array for a leaf faction', () => {
      expect(getDescendantIds(4, tree)).toEqual([]);
    });

    it('does not cross into a disconnected subtree', () => {
      expect(getDescendantIds(5, tree)).toEqual([6]);
    });

    it('does not infinite-loop on a malformed pre-existing cycle in the data', () => {
      const corrupted: HierarchyNode[] = [
        { id: 10, parent_faction_id: 11 },
        { id: 11, parent_faction_id: 12 },
        { id: 12, parent_faction_id: 10 },
      ];
      const result = getDescendantIds(10, corrupted);
      expect(result.length).toBeLessThanOrEqual(corrupted.length);
    });
  });

  describe('wouldCreateCycle', () => {
    it('returns true when a faction is assigned itself as parent', () => {
      expect(wouldCreateCycle(2, 2, tree)).toBe(true);
    });

    it('returns true when the candidate parent is a descendant of the faction', () => {
      // Assigning 1's parent to 4 (its own descendant) would create a cycle.
      expect(wouldCreateCycle(1, 4, tree)).toBe(true);
    });

    it('returns false for a valid, non-cyclic reassignment', () => {
      // Assigning 6's parent to 1 is fine - disconnected subtrees, no cycle.
      expect(wouldCreateCycle(6, 1, tree)).toBe(false);
    });

    it('returns false when clearing the parent (null candidate)', () => {
      expect(wouldCreateCycle(4, null, tree)).toBe(false);
    });

    it('returns false for an unrelated reassignment deeper in the same tree', () => {
      // Assigning 4's parent to 1 directly (skipping 2, 3) is fine - no cycle.
      expect(wouldCreateCycle(4, 1, tree)).toBe(false);
    });
  });
});
