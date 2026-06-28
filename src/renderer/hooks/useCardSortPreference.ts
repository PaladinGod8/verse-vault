import type { CardSortListKey, CardSortMethod } from '../../shared/contracts/settingsTypes';
import { useAppSettings } from './useAppSettings';

/** Reads and persists the chosen card-grid sort method for a given list, scoped per list key. */
export function useCardSortPreference(listKey: CardSortListKey): {
  method: CardSortMethod;
  setMethod: (method: CardSortMethod) => void;
} {
  const { config, updateConfig } = useAppSettings();
  const method = config.cardSortPreferences?.[listKey] ?? 'alphabetical';

  const setMethod = (nextMethod: CardSortMethod) => {
    void updateConfig({
      cardSortPreferences: {
        ...config.cardSortPreferences,
        [listKey]: nextMethod,
      },
    });
  };

  return { method, setMethod };
}
