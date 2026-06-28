import type { CardSortMethod } from '../../shared/contracts/settingsTypes';
import { sortNamedRecords } from './sortNamedRecords';

type ViewableRecord = {
  id: number;
  name: string;
  last_viewed_at: string | null;
};

export function sortByRecentlyViewed<T extends ViewableRecord>(records: readonly T[]): T[] {
  return [...records].sort((left, right) => {
    if (left.last_viewed_at && right.last_viewed_at) {
      if (left.last_viewed_at !== right.last_viewed_at) {
        return left.last_viewed_at > right.last_viewed_at ? -1 : 1;
      }
    } else if (left.last_viewed_at || right.last_viewed_at) {
      return left.last_viewed_at ? -1 : 1;
    }

    return left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export function sortCardRecords<T extends ViewableRecord>(
  records: readonly T[],
  method: CardSortMethod,
): T[] {
  return method === 'recentlyViewed' ? sortByRecentlyViewed(records) : sortNamedRecords(records);
}
