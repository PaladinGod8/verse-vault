import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from 'react-router-dom';
import BattleMapRuntimeCanvas from '../components/runtime/BattleMapRuntimeCanvas';
import RuntimeGridControls from '../components/runtime/RuntimeGridControls';
import {
  mergeBattleMapConfigWithRuntime,
  normalizeRuntimeGridConfig,
  parseBattleMapRuntimeState,
  serializeRuntimeConfig,
} from '../lib/battlemapRuntimeState';

const RUNTIME_SAVE_DEBOUNCE_MS = 220;
const UNSAVED_RUNTIME_CONFIRMATION_MESSAGE =
  'Some runtime changes are still unsaved. Exit runtime and discard those changes?';

export default function BattleMapRuntimePage() {
  const navigate = useNavigate();
  const { id, battleMapId } = useParams();

  const worldId = useMemo(() => {
    if (!id) {
      return null;
    }

    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [id]);

  const parsedBattleMapId = useMemo(() => {
    if (!battleMapId) {
      return null;
    }

    const parsed = Number(battleMapId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [battleMapId]);

  const battleMapsRoute =
    worldId !== null ? `/world/${worldId}/battlemaps` : '/';

  const [battleMap, setBattleMap] = useState<BattleMap | null>(null);
  const [battleMapConfig, setBattleMapConfig] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [runtimeConfig, setRuntimeConfig] =
    useState<BattleMapRuntimeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingRuntimeConfig, setIsSavingRuntimeConfig] = useState(false);
  const [runtimeSaveError, setRuntimeSaveError] = useState<string | null>(null);

  const battleMapConfigRef = useRef<Record<string, unknown> | null>(null);
  const runtimeConfigRef = useRef<BattleMapRuntimeConfig | null>(null);
  const runtimeSaveRequestIdRef = useRef(0);
  const runtimeSaveTimerRef = useRef<number | null>(null);
  const activeRuntimeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const isResolvingBlockedNavigationRef = useRef(false);
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
      currentRuntimeKey !== lastPersistedRuntimeConfigKeyRef.current ||
      runtimeSaveTimerRef.current !== null ||
      activeRuntimeSavePromiseRef.current !== null
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
      lastPersistedRuntimeConfigKeyRef.current =
        parsedRuntimeState.runtimeConfigKey;
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
  }, [parsedBattleMapId]);

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

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasPendingRuntimeChanges()) {
          return;
        }

        event.preventDefault();
        event.returnValue = '';
      },
      [hasPendingRuntimeChanges],
    ),
  );

  const runtimeExitBlocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (!hasPendingRuntimeChanges()) {
          return false;
        }

        return (
          currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search ||
          currentLocation.hash !== nextLocation.hash
        );
      },
      [hasPendingRuntimeChanges],
    ),
  );

  useEffect(() => {
    if (runtimeExitBlocker.state !== 'blocked') {
      return;
    }
    if (isResolvingBlockedNavigationRef.current) {
      return;
    }

    isResolvingBlockedNavigationRef.current = true;
    let isActive = true;

    const resolveBlockedNavigation = async () => {
      const didPersist = await flushRuntimePersistence();
      if (!isActive) {
        return;
      }

      if (didPersist || !hasPendingRuntimeChanges()) {
        runtimeExitBlocker.proceed();
        return;
      }

      const shouldDiscardChanges = window.confirm(
        UNSAVED_RUNTIME_CONFIRMATION_MESSAGE,
      );
      if (shouldDiscardChanges) {
        runtimeExitBlocker.proceed();
        return;
      }

      runtimeExitBlocker.reset();
    };

    void resolveBlockedNavigation().finally(() => {
      if (isActive) {
        isResolvingBlockedNavigationRef.current = false;
      }
    });

    return () => {
      isActive = false;
      isResolvingBlockedNavigationRef.current = false;
    };
  }, [flushRuntimePersistence, hasPendingRuntimeChanges, runtimeExitBlocker]);

  useEffect(() => {
    battleMapConfigRef.current = battleMapConfig;
  }, [battleMapConfig]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
  }, [runtimeConfig]);

  useEffect(() => {
    let isMounted = true;
    clearRuntimeSaveTimer();
    setIsSavingRuntimeConfig(false);
    setRuntimeSaveError(null);
    activeRuntimeSavePromiseRef.current = null;
    runtimeSaveRequestIdRef.current += 1;
    lastPersistedRuntimeConfigKeyRef.current = null;

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
        const existingBattleMap =
          await window.db.battlemaps.getById(parsedBattleMapId);
        if (!existingBattleMap || existingBattleMap.world_id !== worldId) {
          if (isMounted) {
            setBattleMap(null);
            setBattleMapConfig(null);
            battleMapConfigRef.current = null;
            setRuntimeConfig(null);
            runtimeConfigRef.current = null;
            setError('BattleMap not found.');
          }
          return;
        }

        try {
          const parsedRuntimeState = parseBattleMapRuntimeState(
            existingBattleMap.config,
          );

          if (isMounted) {
            setBattleMap(existingBattleMap);
            setBattleMapConfig(parsedRuntimeState.battleMapConfig);
            battleMapConfigRef.current = parsedRuntimeState.battleMapConfig;
            setRuntimeConfig(parsedRuntimeState.runtimeConfig);
            runtimeConfigRef.current = parsedRuntimeState.runtimeConfig;
            lastPersistedRuntimeConfigKeyRef.current =
              parsedRuntimeState.runtimeConfigKey;
          }
        } catch {
          if (isMounted) {
            setBattleMap(existingBattleMap);
            setBattleMapConfig(null);
            battleMapConfigRef.current = null;
            setRuntimeConfig(null);
            runtimeConfigRef.current = null;
            lastPersistedRuntimeConfigKeyRef.current = null;
            setError(
              'Invalid runtime config JSON. Update this BattleMap config before entering runtime.',
            );
          }
          return;
        }
      } catch {
        if (isMounted) {
          setBattleMap(null);
          setBattleMapConfig(null);
          battleMapConfigRef.current = null;
          setRuntimeConfig(null);
          runtimeConfigRef.current = null;
          lastPersistedRuntimeConfigKeyRef.current = null;
          setError('Unable to load BattleMap runtime right now.');
        }
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
  }, [clearRuntimeSaveTimer, worldId, parsedBattleMapId]);

  useEffect(() => {
    return () => {
      clearRuntimeSaveTimer();
      runtimeSaveRequestIdRef.current += 1;
    };
  }, [clearRuntimeSaveTimer]);

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

  const handleExitRuntime = () => {
    navigate(battleMapsRoute);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
        <div className="space-y-2">
          <Link
            to={battleMapsRoute}
            className="inline-flex items-center text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Back to BattleMaps
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {battleMap ? `${battleMap.name} Runtime` : 'BattleMap Runtime'}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleExitRuntime}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
        >
          Exit Runtime
        </button>
      </header>

      <main className="p-6">
        {isLoading ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-sm">
            Loading runtime...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="max-w-2xl space-y-4 rounded-xl border border-amber-300/40 bg-amber-100 p-6 text-amber-900 shadow-sm">
            <h2 className="text-lg font-semibold">Runtime unavailable</h2>
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={handleExitRuntime}
              className="inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-950"
            >
              Exit Runtime
            </button>
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                Runtime Canvas
              </h2>
              <p className="text-sm text-slate-300">
                Grid mode, cell size, and origin offsets update instantly and
                persist to BattleMap config.
              </p>
            </div>

            {runtimeConfig ? (
              <RuntimeGridControls
                gridConfig={runtimeConfig.grid}
                isSaving={isSavingRuntimeConfig}
                saveError={runtimeSaveError}
                onChange={handleGridConfigChange}
              />
            ) : null}

            <div className="h-[55vh] min-h-[320px]">
              {runtimeConfig ? (
                <BattleMapRuntimeCanvas
                  runtimeConfig={runtimeConfig}
                  className="h-full w-full"
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
