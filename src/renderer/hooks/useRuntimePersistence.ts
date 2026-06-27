import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from 'react';

import {
  mergeBattleMapConfigWithRuntime,
  parseBattleMapRuntimeState,
  serializeRuntimeConfig,
} from '../lib/battlemapRuntimeState';

const RUNTIME_SAVE_DEBOUNCE_MS = 220;

export type RuntimePersistenceController = {
  battleMapConfigRef: ReturnType<typeof useRef<Record<string, unknown> | null>>;
  runtimeConfigRef: ReturnType<typeof useRef<BattleMapRuntimeConfig | null>>;
  runtimeSaveRequestIdRef: ReturnType<typeof useRef<number>>;
  lastPersistedRuntimeConfigKeyRef: ReturnType<typeof useRef<string | null>>;
  isSavingRuntimeConfig: boolean;
  runtimeSaveError: string | null;
  setIsSavingRuntimeConfig: Dispatch<SetStateAction<boolean>>;
  setRuntimeSaveError: Dispatch<SetStateAction<string | null>>;
  clearRuntimeSaveTimer: () => void;
  hasPendingRuntimeChanges: () => boolean;
  queueRuntimePersist: () => void;
  flushRuntimePersistence: () => Promise<boolean>;
};

/**
 * Debounced, deduplicated persistence of the BattleMap runtime config
 * (grid settings) back to the DB via IPC. `battleMapConfigRef` and
 * `runtimeConfigRef` are exposed because the page's data-loading effects
 * (battlemap load, IPC sync) write to them directly to keep this hook's
 * synchronous reads in sync with the page's `battleMapConfig`/`runtimeConfig`
 * state without waiting for a render.
 */
export default function useRuntimePersistence({
  parsedBattleMapId,
  setBattleMap,
  setBattleMapConfig,
  setRuntimeConfig,
}: {
  parsedBattleMapId: number | null;
  setBattleMap: Dispatch<SetStateAction<BattleMap | null>>;
  setBattleMapConfig: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  setRuntimeConfig: Dispatch<SetStateAction<BattleMapRuntimeConfig | null>>;
}): RuntimePersistenceController {
  const [isSavingRuntimeConfig, setIsSavingRuntimeConfig] = useState(false);
  const [runtimeSaveError, setRuntimeSaveError] = useState<string | null>(null);

  const battleMapConfigRef = useRef<Record<string, unknown> | null>(null);
  const runtimeConfigRef = useRef<BattleMapRuntimeConfig | null>(null);
  const runtimeSaveRequestIdRef = useRef(0);
  const runtimeSaveTimerRef = useRef<number | null>(null);
  const activeRuntimeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const lastPersistedRuntimeConfigKeyRef = useRef<string | null>(null);

  const clearRuntimeSaveTimer = useCallback(() => {
    if (runtimeSaveTimerRef.current !== null) {
      window.clearTimeout(runtimeSaveTimerRef.current);
      runtimeSaveTimerRef.current = null;
    }
  }, []);

  const hasPendingRuntimeChanges = useCallback(() => {
    const currentRuntimeConfig = runtimeConfigRef.current;
    if (!currentRuntimeConfig) {
      return false;
    }

    const currentRuntimeKey = serializeRuntimeConfig(currentRuntimeConfig);
    return (
      currentRuntimeKey !== lastPersistedRuntimeConfigKeyRef.current
      || runtimeSaveTimerRef.current !== null
      || activeRuntimeSavePromiseRef.current !== null
    );
  }, []);

  const persistRuntimeConfigNow = useCallback(async (): Promise<boolean> => {
    if (parsedBattleMapId === null) {
      return true;
    }

    const currentRuntimeConfig = runtimeConfigRef.current;
    const currentBattleMapConfig = battleMapConfigRef.current;
    if (!currentRuntimeConfig || !currentBattleMapConfig) {
      setIsSavingRuntimeConfig(false);
      return true;
    }

    const nextRuntimeKey = serializeRuntimeConfig(currentRuntimeConfig);
    if (nextRuntimeKey === lastPersistedRuntimeConfigKeyRef.current) {
      setIsSavingRuntimeConfig(false);
      return true;
    }

    const mergedConfig = mergeBattleMapConfigWithRuntime(
      currentBattleMapConfig,
      currentRuntimeConfig,
    );
    const requestId = runtimeSaveRequestIdRef.current + 1;
    runtimeSaveRequestIdRef.current = requestId;
    setIsSavingRuntimeConfig(true);
    setRuntimeSaveError(null);

    try {
      const updatedBattleMap = await window.db.battlemaps.update(
        parsedBattleMapId,
        {
          config: JSON.stringify(mergedConfig),
        },
      );
      if (requestId !== runtimeSaveRequestIdRef.current) {
        return false;
      }

      const parsedRuntimeState = parseBattleMapRuntimeState(
        updatedBattleMap.config,
      );
      battleMapConfigRef.current = parsedRuntimeState.battleMapConfig;
      runtimeConfigRef.current = parsedRuntimeState.runtimeConfig;
      lastPersistedRuntimeConfigKeyRef.current = parsedRuntimeState.runtimeConfigKey;
      setBattleMap(updatedBattleMap);
      setBattleMapConfig(parsedRuntimeState.battleMapConfig);
      setRuntimeConfig(parsedRuntimeState.runtimeConfig);
      setIsSavingRuntimeConfig(false);
      setRuntimeSaveError(null);
      return true;
    } catch (saveError) {
      if (requestId !== runtimeSaveRequestIdRef.current) {
        return false;
      }

      setIsSavingRuntimeConfig(false);
      setRuntimeSaveError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to persist runtime settings right now.',
      );
      return false;
    }
  }, [parsedBattleMapId, setBattleMap, setBattleMapConfig, setRuntimeConfig]);

  const persistRuntimeConfig = useCallback(async (): Promise<boolean> => {
    if (activeRuntimeSavePromiseRef.current) {
      return activeRuntimeSavePromiseRef.current;
    }

    const savePromise = persistRuntimeConfigNow();
    activeRuntimeSavePromiseRef.current = savePromise;

    try {
      return await savePromise;
    } finally {
      if (activeRuntimeSavePromiseRef.current === savePromise) {
        activeRuntimeSavePromiseRef.current = null;
      }
    }
  }, [persistRuntimeConfigNow]);

  const queueRuntimePersist = useCallback(() => {
    clearRuntimeSaveTimer();
    setIsSavingRuntimeConfig(true);
    setRuntimeSaveError(null);
    runtimeSaveTimerRef.current = window.setTimeout(() => {
      runtimeSaveTimerRef.current = null;
      void persistRuntimeConfig();
    }, RUNTIME_SAVE_DEBOUNCE_MS);
  }, [clearRuntimeSaveTimer, persistRuntimeConfig]);

  const flushRuntimePersistence = useCallback(async (): Promise<boolean> => {
    clearRuntimeSaveTimer();

    if (activeRuntimeSavePromiseRef.current) {
      const inFlightSaveSucceeded = await activeRuntimeSavePromiseRef.current;
      if (!inFlightSaveSucceeded && hasPendingRuntimeChanges()) {
        return false;
      }
    }

    let attempts = 0;
    while (hasPendingRuntimeChanges() && attempts < 2) {
      attempts += 1;
      const didPersist = await persistRuntimeConfig();
      if (!didPersist && hasPendingRuntimeChanges()) {
        return false;
      }

      if (activeRuntimeSavePromiseRef.current) {
        const inFlightSaveSucceeded = await activeRuntimeSavePromiseRef.current;
        if (!inFlightSaveSucceeded && hasPendingRuntimeChanges()) {
          return false;
        }
      }
    }

    if (!hasPendingRuntimeChanges()) {
      setIsSavingRuntimeConfig(false);
      return true;
    }

    return false;
  }, [clearRuntimeSaveTimer, hasPendingRuntimeChanges, persistRuntimeConfig]);

  return {
    battleMapConfigRef,
    runtimeConfigRef,
    runtimeSaveRequestIdRef,
    lastPersistedRuntimeConfigKeyRef,
    isSavingRuntimeConfig,
    runtimeSaveError,
    setIsSavingRuntimeConfig,
    setRuntimeSaveError,
    clearRuntimeSaveTimer,
    hasPendingRuntimeChanges,
    queueRuntimePersist,
    flushRuntimePersistence,
  };
}
