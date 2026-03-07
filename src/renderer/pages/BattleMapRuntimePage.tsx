import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBeforeUnload, useNavigate, useParams } from 'react-router-dom';
import AbilityPickerPanel from '../components/runtime/AbilityPickerPanel';
import BattleMapRuntimeCanvas, {
  type RuntimeSceneToken,
} from '../components/runtime/BattleMapRuntimeCanvas';
import RuntimeGridControls from '../components/runtime/RuntimeGridControls';
import RuntimeTokenPalette from '../components/runtime/RuntimeTokenPalette';
import StatBlockPopup from '../components/runtime/StatBlockPopup';
import {
  mergeBattleMapConfigWithRuntime,
  normalizeRuntimeGridConfig,
  parseBattleMapRuntimeState,
  serializeRuntimeConfig,
} from '../lib/battlemapRuntimeState';
import { clampGridCellSize } from '../lib/runtimeMath';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

const RUNTIME_SAVE_DEBOUNCE_MS = 220;
const UNSAVED_RUNTIME_CONFIRMATION_MESSAGE =
  'Some runtime changes are still unsaved. Exit runtime and discard those changes?';
const TOKEN_PLACEMENT_COLUMNS = 5;
const TOKEN_PLACEMENT_OFFSET_FACTOR = 0.35;
const SQRT_3 = Math.sqrt(3);

function roundPointyHexAxial(
  q: number,
  r: number,
): { roundedQ: number; roundedR: number; } {
  const x = q;
  const z = r;
  const y = -x - z;

  let roundedX = Math.round(x);
  let roundedY = Math.round(y);
  let roundedZ = Math.round(z);

  const xDiff = Math.abs(roundedX - x);
  const yDiff = Math.abs(roundedY - y);
  const zDiff = Math.abs(roundedZ - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    roundedX = -roundedY - roundedZ;
  } else if (yDiff > zDiff) {
    roundedY = -roundedX - roundedZ;
  } else {
    roundedZ = -roundedX - roundedY;
  }

  return { roundedQ: roundedX, roundedR: roundedZ };
}

function snapTokenPositionToGrid(
  x: number,
  y: number,
  gridConfig: BattleMapRuntimeGridConfig,
): { x: number; y: number; } {
  if (gridConfig.mode === 'none') {
    return { x, y };
  }

  const cellSize = clampGridCellSize(gridConfig.cellSize);
  if (gridConfig.mode === 'square') {
    return {
      x: gridConfig.originX
        + (Math.floor((x - gridConfig.originX) / cellSize) + 0.5) * cellSize,
      y: gridConfig.originY
        + (Math.floor((y - gridConfig.originY) / cellSize) + 0.5) * cellSize,
    };
  }

  const radius = cellSize * 0.5;
  const shiftedX = x - gridConfig.originX;
  const shiftedY = y - gridConfig.originY;
  const q = ((SQRT_3 / 3) * shiftedX - shiftedY / 3) / radius;
  const r = ((2 / 3) * shiftedY) / radius;
  const { roundedQ, roundedR } = roundPointyHexAxial(q, r);
  return {
    x: gridConfig.originX + radius * SQRT_3 * (roundedQ + roundedR * 0.5),
    y: gridConfig.originY + radius * 1.5 * roundedR,
  };
}

function getTokenPlacementPosition(
  existingCount: number,
  runtimeConfig: BattleMapRuntimeConfig,
): { x: number; y: number; } {
  const cellSize = clampGridCellSize(runtimeConfig.grid.cellSize);
  const row = Math.floor(existingCount / TOKEN_PLACEMENT_COLUMNS);
  const column = existingCount % TOKEN_PLACEMENT_COLUMNS;
  const offsetX = (column - Math.floor(TOKEN_PLACEMENT_COLUMNS / 2))
    * cellSize
    * TOKEN_PLACEMENT_OFFSET_FACTOR;
  const offsetY = row * cellSize * TOKEN_PLACEMENT_OFFSET_FACTOR;

  return snapTokenPositionToGrid(
    runtimeConfig.camera.x + offsetX,
    runtimeConfig.camera.y + offsetY,
    runtimeConfig.grid,
  );
}

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

  const battleMapsRoute = worldId !== null ? `/world/${worldId}/battlemaps` : '/';

  const [battleMap, setBattleMap] = useState<BattleMap | null>(null);
  const [battleMapConfig, setBattleMapConfig] = useState<
    Record<
      string,
      unknown
    > | null
  >(null);
  const [runtimeConfig, setRuntimeConfig] = useState<BattleMapRuntimeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingRuntimeConfig, setIsSavingRuntimeConfig] = useState(false);
  const [runtimeSaveError, setRuntimeSaveError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignLoadError, setCampaignLoadError] = useState<string | null>(
    null,
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null,
  );
  const [worldTokens, setWorldTokens] = useState<Token[]>([]);
  const [isLoadingWorldTokens, setIsLoadingWorldTokens] = useState(true);
  const [worldTokenLoadError, setWorldTokenLoadError] = useState<string | null>(
    null,
  );
  const [campaignTokens, setCampaignTokens] = useState<Token[]>([]);
  const [isLoadingCampaignTokens, setIsLoadingCampaignTokens] = useState(false);
  const [campaignTokenLoadError, setCampaignTokenLoadError] = useState<
    string | null
  >(null);
  const [runtimeTokens, setRuntimeTokens] = useState<RuntimeSceneToken[]>([]);
  const [selectedRuntimeTokenInstanceId, setSelectedRuntimeTokenInstanceId] = useState<
    string | null
  >(null);
  const [showInvisibleTokens, setShowInvisibleTokens] = useState(true);
  const [castingAbility, setCastingAbility] = useState<Ability | null>(null);
  const [castingAngleRad, setCastingAngleRad] = useState<number>(0);
  const [statBlockPopupTokenInstanceId, setStatBlockPopupTokenInstanceId] = useState<
    string | null
  >(null);

  const battleMapConfigRef = useRef<Record<string, unknown> | null>(null);
  const runtimeConfigRef = useRef<BattleMapRuntimeConfig | null>(null);
  const runtimeSaveRequestIdRef = useRef(0);
  const runtimeSaveTimerRef = useRef<number | null>(null);
  const activeRuntimeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const lastPersistedRuntimeConfigKeyRef = useRef<string | null>(null);
  const runtimeTokenInstanceIdCounterRef = useRef(0);

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

  useEffect(() => {
    battleMapConfigRef.current = battleMapConfig;
  }, [battleMapConfig]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
  }, [runtimeConfig]);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setCampaigns([]);
      setSelectedCampaignId(null);
      setCampaignLoadError(null);
      setIsLoadingCampaigns(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCampaigns = async () => {
      setIsLoadingCampaigns(true);
      setCampaignLoadError(null);

      try {
        const worldCampaigns = await window.db.campaigns.getAllByWorld(worldId);
        if (!isMounted) {
          return;
        }
        setCampaigns(worldCampaigns);
      } catch {
        if (!isMounted) {
          return;
        }
        setCampaigns([]);
        setCampaignLoadError('Unable to load campaigns for runtime tokens.');
      } finally {
        if (isMounted) {
          setIsLoadingCampaigns(false);
        }
      }
    };

    void loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorldTokens([]);
      setWorldTokenLoadError(null);
      setIsLoadingWorldTokens(false);
      return () => {
        isMounted = false;
      };
    }

    const loadWorldTokens = async () => {
      setIsLoadingWorldTokens(true);
      setWorldTokenLoadError(null);

      try {
        const tokens = await window.db.tokens.getAllByWorld(worldId);
        if (!isMounted) {
          return;
        }

        const scopedWorldTokens = tokens
          .filter((token) => token.campaign_id === null)
          .map((token) => ({
            ...token,
            image_src: normalizeTokenImageSrc(token.image_src),
          }));
        setWorldTokens(scopedWorldTokens);
        setRuntimeTokens((currentTokens) => {
          const tokenById = new Map(
            scopedWorldTokens.map((token) => [token.id, token]),
          );
          return currentTokens.map((runtimeToken) => {
            if (
              runtimeToken.campaignId !== null
              || runtimeToken.sourceTokenId === null
            ) {
              return runtimeToken;
            }

            const sourceToken = tokenById.get(runtimeToken.sourceTokenId);
            if (!sourceToken) {
              return {
                ...runtimeToken,
                sourceMissing: true,
              };
            }

            return {
              ...runtimeToken,
              name: sourceToken.name,
              imageSrc: normalizeTokenImageSrc(sourceToken.image_src),
              isVisible: sourceToken.is_visible === 1,
              sourceMissing: false,
            };
          });
        });
      } catch {
        if (!isMounted) {
          return;
        }
        setWorldTokens([]);
        setWorldTokenLoadError('Unable to load world tokens.');
      } finally {
        if (isMounted) {
          setIsLoadingWorldTokens(false);
        }
      }
    };

    void loadWorldTokens();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  useEffect(() => {
    if (campaigns.length === 0) {
      setSelectedCampaignId(null);
      return;
    }

    const hasSelectedCampaign = selectedCampaignId !== null
      && campaigns.some((campaign) => campaign.id === selectedCampaignId);
    if (hasSelectedCampaign) {
      return;
    }

    setSelectedCampaignId(campaigns[0].id);
  }, [campaigns, selectedCampaignId]);

  useEffect(() => {
    let isMounted = true;

    if (selectedCampaignId === null) {
      setCampaignTokens([]);
      setCampaignTokenLoadError(null);
      setIsLoadingCampaignTokens(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCampaignTokens = async () => {
      setIsLoadingCampaignTokens(true);
      setCampaignTokenLoadError(null);

      try {
        const tokens = await window.db.tokens.getAllByCampaign(selectedCampaignId);
        if (!isMounted) {
          return;
        }

        setCampaignTokens(
          tokens.map((token) => ({
            ...token,
            image_src: normalizeTokenImageSrc(token.image_src),
          })),
        );
        setRuntimeTokens((currentTokens) => {
          const tokenById = new Map(tokens.map((token) => [token.id, token]));
          return currentTokens.map((runtimeToken) => {
            if (
              runtimeToken.campaignId !== selectedCampaignId
              || runtimeToken.sourceTokenId === null
            ) {
              return runtimeToken;
            }

            const sourceToken = tokenById.get(runtimeToken.sourceTokenId);
            if (!sourceToken) {
              return {
                ...runtimeToken,
                sourceMissing: true,
              };
            }

            return {
              ...runtimeToken,
              name: sourceToken.name,
              imageSrc: normalizeTokenImageSrc(sourceToken.image_src),
              isVisible: sourceToken.is_visible === 1,
              sourceMissing: false,
            };
          });
        });
      } catch {
        if (!isMounted) {
          return;
        }
        setCampaignTokens([]);
        setCampaignTokenLoadError('Unable to load tokens for this campaign.');
      } finally {
        if (isMounted) {
          setIsLoadingCampaignTokens(false);
        }
      }
    };

    void loadCampaignTokens();

    return () => {
      isMounted = false;
    };
  }, [selectedCampaignId]);

  useEffect(() => {
    if (selectedRuntimeTokenInstanceId === null) {
      return;
    }

    const hasSelectedToken = runtimeTokens.some(
      (token) => token.instanceId === selectedRuntimeTokenInstanceId,
    );
    if (!hasSelectedToken) {
      setSelectedRuntimeTokenInstanceId(null);
    }
  }, [runtimeTokens, selectedRuntimeTokenInstanceId]);

  useEffect(() => {
    if (statBlockPopupTokenInstanceId === null) {
      return;
    }

    const hasPopupToken = runtimeTokens.some(
      (token) => token.instanceId === statBlockPopupTokenInstanceId,
    );
    if (!hasPopupToken) {
      setStatBlockPopupTokenInstanceId(null);
    }
  }, [runtimeTokens, statBlockPopupTokenInstanceId]);

  useEffect(() => {
    if (
      statBlockPopupTokenInstanceId !== null
      && statBlockPopupTokenInstanceId !== selectedRuntimeTokenInstanceId
    ) {
      setStatBlockPopupTokenInstanceId(null);
    }
  }, [selectedRuntimeTokenInstanceId, statBlockPopupTokenInstanceId]);

  useEffect(() => {
    setCastingAbility(null);
  }, [selectedRuntimeTokenInstanceId]);

  const selectedToken = useMemo(
    () =>
      runtimeTokens.find(
        (t) => t.instanceId === selectedRuntimeTokenInstanceId,
      ) ?? null,
    [runtimeTokens, selectedRuntimeTokenInstanceId],
  );

  const popupToken = useMemo(
    () =>
      runtimeTokens.find((token) => token.instanceId === statBlockPopupTokenInstanceId)
        ?? null,
    [runtimeTokens, statBlockPopupTokenInstanceId],
  );

  useEffect(() => {
    let isMounted = true;
    clearRuntimeSaveTimer();
    setIsSavingRuntimeConfig(false);
    setRuntimeSaveError(null);
    activeRuntimeSavePromiseRef.current = null;
    runtimeSaveRequestIdRef.current += 1;
    lastPersistedRuntimeConfigKeyRef.current = null;
    runtimeTokenInstanceIdCounterRef.current = 0;
    setRuntimeTokens([]);
    setSelectedRuntimeTokenInstanceId(null);
    setStatBlockPopupTokenInstanceId(null);

    if (worldId === null || parsedBattleMapId === null) {
      setBattleMap(null);
      setBattleMapConfig(null);
      battleMapConfigRef.current = null;
      setRuntimeConfig(null);
      runtimeConfigRef.current = null;
      setCampaignTokens([]);
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
            setStatBlockPopupTokenInstanceId(null);
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
            setRuntimeTokens([]);
            setSelectedRuntimeTokenInstanceId(null);
            setStatBlockPopupTokenInstanceId(null);
            lastPersistedRuntimeConfigKeyRef.current = parsedRuntimeState.runtimeConfigKey;
          }
        } catch {
          if (isMounted) {
            setBattleMap(existingBattleMap);
            setBattleMapConfig(null);
            battleMapConfigRef.current = null;
            setRuntimeConfig(null);
            runtimeConfigRef.current = null;
            setRuntimeTokens([]);
            setSelectedRuntimeTokenInstanceId(null);
            setStatBlockPopupTokenInstanceId(null);
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
          setRuntimeTokens([]);
          setSelectedRuntimeTokenInstanceId(null);
          setStatBlockPopupTokenInstanceId(null);
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

  const handleCampaignSelectionChange = (campaignId: number | null) => {
    setSelectedCampaignId(campaignId);
  };

  const handleAddRuntimeToken = (token: Token) => {
    const currentRuntimeConfig = runtimeConfigRef.current;
    if (!currentRuntimeConfig) {
      return;
    }

    if (
      currentRuntimeConfig.grid.mode !== 'none'
      && token.grid_type !== currentRuntimeConfig.grid.mode
    ) {
      return;
    }

    let nextSelectedTokenInstanceId: string | null = null;
    setRuntimeTokens((currentTokens) => {
      const existingRuntimeToken = currentTokens.find(
        (runtimeToken) =>
          runtimeToken.campaignId === token.campaign_id
          && runtimeToken.sourceTokenId === token.id
          && !runtimeToken.sourceMissing,
      );
      if (existingRuntimeToken) {
        nextSelectedTokenInstanceId = existingRuntimeToken.instanceId;
        return currentTokens;
      }

      runtimeTokenInstanceIdCounterRef.current += 1;
      const instanceId = `runtime-token-${token.id}-${runtimeTokenInstanceIdCounterRef.current}`;
      const placement = getTokenPlacementPosition(
        currentTokens.length,
        currentRuntimeConfig,
      );
      nextSelectedTokenInstanceId = instanceId;

      return [
        ...currentTokens,
        {
          instanceId,
          sourceTokenId: token.id,
          campaignId: token.campaign_id,
          name: token.name,
          imageSrc: normalizeTokenImageSrc(token.image_src),
          isVisible: token.is_visible === 1,
          sourceMissing: false,
          x: placement.x,
          y: placement.y,
        },
      ];
    });

    if (nextSelectedTokenInstanceId) {
      setSelectedRuntimeTokenInstanceId(nextSelectedTokenInstanceId);
    }
  };

  const handleSelectRuntimeToken = (tokenInstanceId: string | null) => {
    setSelectedRuntimeTokenInstanceId(tokenInstanceId);
  };

  const handleMoveRuntimeToken = (
    tokenInstanceId: string,
    position: { x: number; y: number; },
  ) => {
    setRuntimeTokens((currentTokens) =>
      currentTokens.map((runtimeToken) =>
        runtimeToken.instanceId === tokenInstanceId
          ? { ...runtimeToken, x: position.x, y: position.y }
          : runtimeToken
      )
    );
  };

  const handleRemoveRuntimeToken = (tokenInstanceId: string) => {
    setRuntimeTokens((currentTokens) =>
      currentTokens.filter(
        (runtimeToken) => runtimeToken.instanceId !== tokenInstanceId,
      )
    );
    setSelectedRuntimeTokenInstanceId((currentSelectedTokenInstanceId) =>
      currentSelectedTokenInstanceId === tokenInstanceId
        ? null
        : currentSelectedTokenInstanceId
    );
    setStatBlockPopupTokenInstanceId((currentPopupTokenInstanceId) =>
      currentPopupTokenInstanceId === tokenInstanceId ? null : currentPopupTokenInstanceId
    );
  };

  const handleRuntimeTokenDoubleClick = (tokenInstanceId: string) => {
    setSelectedRuntimeTokenInstanceId(tokenInstanceId);
    setStatBlockPopupTokenInstanceId(tokenInstanceId);
  };

  const handleExitRuntime = async () => {
    const didPersist = await flushRuntimePersistence();
    if (!didPersist && hasPendingRuntimeChanges()) {
      const shouldDiscardChanges = window.confirm(
        UNSAVED_RUNTIME_CONFIRMATION_MESSAGE,
      );
      if (!shouldDiscardChanges) {
        return;
      }
    }
    navigate(battleMapsRoute);
  };

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100'>
      <header className='flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4'>
        <div className='space-y-2'>
          <Link
            to={battleMapsRoute}
            onClick={(event) => {
              event.preventDefault();
              void handleExitRuntime();
            }}
            className='inline-flex items-center text-sm font-medium text-slate-300 transition hover:text-white'
          >
            Back to BattleMaps
          </Link>
          <h1 className='text-2xl font-semibold tracking-tight text-white'>
            {battleMap ? `${battleMap.name} Runtime` : 'BattleMap Runtime'}
          </h1>
        </div>

        <button
          type='button'
          onClick={() => {
            void handleExitRuntime();
          }}
          className='shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white'
        >
          Exit Runtime
        </button>
      </header>

      <main className='p-6'>
        {isLoading
          ? (
            <section className='rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-sm'>
              Loading runtime...
            </section>
          )
          : null}

        {!isLoading && error
          ? (
            <section className='max-w-2xl space-y-4 rounded-xl border border-amber-300/40 bg-amber-100 p-6 text-amber-900 shadow-sm'>
              <h2 className='text-lg font-semibold'>Runtime unavailable</h2>
              <p className='text-sm'>{error}</p>
              <button
                type='button'
                onClick={() => {
                  void handleExitRuntime();
                }}
                className='inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-950'
              >
                Exit Runtime
              </button>
            </section>
          )
          : null}

        {!isLoading && !error
          ? (
            <div className='overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm'>
              <div className='border-b border-slate-800 px-6 py-4'>
                <h2 className='text-lg font-semibold text-white'>
                  Runtime Canvas
                </h2>
                <p className='text-sm text-slate-300'>
                  Grid settings persist automatically. Token placement and movement are runtime-only
                  for this session.
                </p>
              </div>

              {runtimeConfig
                ? (
                  <RuntimeGridControls
                    gridConfig={runtimeConfig.grid}
                    isSaving={isSavingRuntimeConfig}
                    saveError={runtimeSaveError}
                    onChange={handleGridConfigChange}
                  />
                )
                : null}

              <RuntimeTokenPalette
                campaigns={campaigns}
                selectedCampaignId={selectedCampaignId}
                isLoadingCampaigns={isLoadingCampaigns}
                campaignLoadError={campaignLoadError}
                worldTokens={worldTokens}
                isLoadingWorldTokens={isLoadingWorldTokens}
                worldTokenLoadError={worldTokenLoadError}
                tokens={campaignTokens}
                isLoadingTokens={isLoadingCampaignTokens}
                tokenLoadError={campaignTokenLoadError}
                placedTokens={runtimeTokens}
                selectedTokenInstanceId={selectedRuntimeTokenInstanceId}
                showInvisibleTokens={showInvisibleTokens}
                activeGridMode={runtimeConfig.grid.mode}
                onShowInvisibleTokensChange={setShowInvisibleTokens}
                onSelectCampaign={handleCampaignSelectionChange}
                onAddToken={handleAddRuntimeToken}
                onSelectPlacedToken={handleSelectRuntimeToken}
                onRemovePlacedToken={handleRemoveRuntimeToken}
              />

              <div className='relative h-[55vh] min-h-[320px]'>
                {runtimeConfig
                  ? (
                    <BattleMapRuntimeCanvas
                      runtimeConfig={runtimeConfig}
                      tokens={runtimeTokens}
                      selectedTokenInstanceId={selectedRuntimeTokenInstanceId}
                      onTokenSelect={handleSelectRuntimeToken}
                      onTokenDoubleClick={handleRuntimeTokenDoubleClick}
                      onTokenMove={handleMoveRuntimeToken}
                      castingState={castingAbility !== null && selectedToken !== null
                        ? {
                          casterX: selectedToken.x,
                          casterY: selectedToken.y,
                          ability: castingAbility,
                          angleRad: castingAngleRad,
                        }
                        : null}
                      onCastingAngleChange={setCastingAngleRad}
                      className='h-full w-full'
                    />
                  )
                  : null}

                {selectedRuntimeTokenInstanceId !== null && worldId !== null
                  ? (
                    <div className='absolute top-3 right-3 w-56'>
                      <AbilityPickerPanel
                        sourceTokenId={selectedToken?.sourceTokenId ?? null}
                        tokenName={selectedToken?.name ?? 'Token'}
                        castingAbility={castingAbility}
                        onAbilitySelect={setCastingAbility}
                      />
                    </div>
                  )
                  : null}
              </div>
            </div>
          )
          : null}

        <StatBlockPopup
          isOpen={statBlockPopupTokenInstanceId !== null}
          tokenName={popupToken?.name ?? 'Token'}
          sourceTokenId={popupToken?.sourceTokenId ?? null}
          castingAbility={castingAbility}
          onAbilitySelect={setCastingAbility}
          onClose={() => setStatBlockPopupTokenInstanceId(null)}
        />
      </main>
    </div>
  );
}
