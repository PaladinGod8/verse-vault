import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import {
  normalizeRuntimeGridConfig,
  parseBattleMapRuntimeState,
  serializeRuntimeConfig,
} from '../lib/battlemapRuntimeState';
import type { RuntimeSceneToken } from '../lib/runtime/runtimeCanvasTypes';
import useRuntimePersistence from './useRuntimePersistence';

/**
 * Owns the BattleMap runtime bootstrap lifecycle: route validation, initial
 * battlemap/runtime loading, ref synchronization for debounced persistence,
 * and grid-config save orchestration.
 */
export default function useBattleMapRuntimeBootstrap({
  worldId,
  parsedBattleMapId,
  setRuntimeTokens,
  setSelectedRuntimeTokenInstanceId,
  resetTokenInstanceIdCounter,
  resetRuntimeScreenState,
}: {
  worldId: number | null;
  parsedBattleMapId: number | null;
  setRuntimeTokens: Dispatch<SetStateAction<RuntimeSceneToken[]>>;
  setSelectedRuntimeTokenInstanceId: Dispatch<SetStateAction<string | null>>;
  resetTokenInstanceIdCounter: () => void;
  resetRuntimeScreenState: () => void;
}) {
  const [battleMap, setBattleMap] = useState<BattleMap | null>(null);
  const [battleMapConfig, setBattleMapConfig] = useState<
    Record<string, unknown> | null
  >(null);
  const [runtimeConfig, setRuntimeConfig] = useState<BattleMapRuntimeConfig | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistence = useRuntimePersistence({
    parsedBattleMapId,
    setBattleMap,
    setBattleMapConfig,
    setRuntimeConfig,
  });
  const {
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
  } = persistence;

  useEffect(() => {
    battleMapConfigRef.current = battleMapConfig;
  }, [battleMapConfig, battleMapConfigRef]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
  }, [runtimeConfig, runtimeConfigRef]);

  useEffect(() => {
    let isMounted = true;

    clearRuntimeSaveTimer();
    setIsSavingRuntimeConfig(false);
    setRuntimeSaveError(null);
    runtimeSaveRequestIdRef.current += 1;
    lastPersistedRuntimeConfigKeyRef.current = null;
    resetTokenInstanceIdCounter();
    setRuntimeTokens([]);
    setSelectedRuntimeTokenInstanceId(null);
    resetRuntimeScreenState();

    if (worldId === null || parsedBattleMapId === null) {
      setBattleMap(null);
      setBattleMapConfig(null);
      battleMapConfigRef.current = null;
      setRuntimeConfig(null);
      runtimeConfigRef.current = null;
      setError('Invalid world or BattleMap id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadBattleMap = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingBattleMap = await window.db.battlemaps.getById(parsedBattleMapId);
        if (!existingBattleMap || existingBattleMap.world_id !== worldId) {
          if (isMounted) {
            setBattleMap(null);
            setBattleMapConfig(null);
            battleMapConfigRef.current = null;
            setRuntimeConfig(null);
            runtimeConfigRef.current = null;
            setRuntimeTokens([]);
            setSelectedRuntimeTokenInstanceId(null);
            resetRuntimeScreenState();
            setError('BattleMap not found.');
          }
          return;
        }

        try {
          const parsedRuntimeState = parseBattleMapRuntimeState(
            existingBattleMap.config,
          );

          if (!isMounted) {
            return;
          }

          setBattleMap(existingBattleMap);
          setBattleMapConfig(parsedRuntimeState.battleMapConfig);
          battleMapConfigRef.current = parsedRuntimeState.battleMapConfig;
          setRuntimeConfig(parsedRuntimeState.runtimeConfig);
          runtimeConfigRef.current = parsedRuntimeState.runtimeConfig;
          setRuntimeTokens([]);
          setSelectedRuntimeTokenInstanceId(null);
          resetRuntimeScreenState();
          lastPersistedRuntimeConfigKeyRef.current = parsedRuntimeState.runtimeConfigKey;
        } catch {
          if (!isMounted) {
            return;
          }

          setBattleMap(existingBattleMap);
          setBattleMapConfig(null);
          battleMapConfigRef.current = null;
          setRuntimeConfig(null);
          runtimeConfigRef.current = null;
          setRuntimeTokens([]);
          setSelectedRuntimeTokenInstanceId(null);
          resetRuntimeScreenState();
          lastPersistedRuntimeConfigKeyRef.current = null;
          setError(
            'Invalid runtime config JSON. Update this BattleMap config before entering runtime.',
          );
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setBattleMap(null);
        setBattleMapConfig(null);
        battleMapConfigRef.current = null;
        setRuntimeConfig(null);
        runtimeConfigRef.current = null;
        setRuntimeTokens([]);
        setSelectedRuntimeTokenInstanceId(null);
        resetRuntimeScreenState();
        lastPersistedRuntimeConfigKeyRef.current = null;
        setError('Unable to load BattleMap runtime right now.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBattleMap();

    return () => {
      isMounted = false;
    };
  }, [
    battleMapConfigRef,
    clearRuntimeSaveTimer,
    lastPersistedRuntimeConfigKeyRef,
    parsedBattleMapId,
    resetRuntimeScreenState,
    resetTokenInstanceIdCounter,
    runtimeConfigRef,
    runtimeSaveRequestIdRef,
    setIsSavingRuntimeConfig,
    setRuntimeSaveError,
    setRuntimeTokens,
    setSelectedRuntimeTokenInstanceId,
    worldId,
  ]);

  useEffect(() => {
    return () => {
      clearRuntimeSaveTimer();
      runtimeSaveRequestIdRef.current += 1;
    };
  }, [clearRuntimeSaveTimer, runtimeSaveRequestIdRef]);

  const handleGridConfigChange = (
    nextGridConfig: BattleMapRuntimeGridConfig,
  ) => {
    const currentRuntimeConfig = runtimeConfigRef.current;
    if (!currentRuntimeConfig) {
      return;
    }

    const normalizedGridConfig = normalizeRuntimeGridConfig(nextGridConfig);
    const nextRuntimeConfig: BattleMapRuntimeConfig = {
      ...currentRuntimeConfig,
      grid: normalizedGridConfig,
    };
    runtimeConfigRef.current = nextRuntimeConfig;
    setRuntimeConfig(nextRuntimeConfig);
    setRuntimeSaveError(null);

    const nextRuntimeConfigKey = serializeRuntimeConfig(nextRuntimeConfig);
    if (nextRuntimeConfigKey !== lastPersistedRuntimeConfigKeyRef.current) {
      queueRuntimePersist();
      return;
    }

    clearRuntimeSaveTimer();
    setIsSavingRuntimeConfig(false);
  };

  return {
    battleMap,
    runtimeConfig,
    isLoading,
    error,
    isSavingRuntimeConfig,
    runtimeSaveError,
    hasPendingRuntimeChanges,
    flushRuntimePersistence,
    handleGridConfigChange,
  };
}
