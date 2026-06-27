import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from 'react';

import type { RuntimeSceneToken } from '../lib/runtime/runtimeCanvasTypes';
import { clampGridCellSize, snapTokenPositionToGrid } from '../lib/runtimeMath';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

const TOKEN_PLACEMENT_COLUMNS = 5;
const TOKEN_PLACEMENT_OFFSET_FACTOR = 0.35;

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

export type RuntimeTokensController = {
  runtimeTokens: RuntimeSceneToken[];
  setRuntimeTokens: Dispatch<SetStateAction<RuntimeSceneToken[]>>;
  selectedRuntimeTokenInstanceId: string | null;
  setSelectedRuntimeTokenInstanceId: Dispatch<SetStateAction<string | null>>;
  resetTokenInstanceIdCounter: () => void;
  handleAddRuntimeToken: (
    token: Token,
    runtimeConfig: BattleMapRuntimeConfig,
  ) => void;
  handleSelectRuntimeToken: (tokenInstanceId: string | null) => void;
  handleMoveRuntimeToken: (
    tokenInstanceId: string,
    position: { x: number; y: number; },
  ) => void;
  handleRemoveRuntimeToken: (tokenInstanceId: string) => void;
  handleRuntimeTokenDoubleClick: (tokenInstanceId: string) => void;
};

/**
 * Runtime-only (not persisted) token placement/selection state for the
 * BattleMap runtime canvas. `setStatBlockPopupTokenInstanceId` is injected
 * because removing/double-clicking a token also opens or closes the
 * statblock popup, whose state is owned by the page (it's shared with the
 * ability-casting UI, which this hook doesn't otherwise touch).
 */
export default function useRuntimeTokens(
  setStatBlockPopupTokenInstanceId: Dispatch<SetStateAction<string | null>>,
): RuntimeTokensController {
  const [runtimeTokens, setRuntimeTokens] = useState<RuntimeSceneToken[]>([]);
  const [selectedRuntimeTokenInstanceId, setSelectedRuntimeTokenInstanceId] = useState<
    string | null
  >(null);
  const runtimeTokenInstanceIdCounterRef = useRef(0);

  const resetTokenInstanceIdCounter = useCallback(() => {
    runtimeTokenInstanceIdCounterRef.current = 0;
  }, []);

  const handleAddRuntimeToken = useCallback((
    token: Token,
    runtimeConfig: BattleMapRuntimeConfig,
  ) => {
    if (
      runtimeConfig.grid.mode !== 'none'
      && token.grid_type !== runtimeConfig.grid.mode
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
        runtimeConfig,
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
  }, []);

  const handleSelectRuntimeToken = useCallback((tokenInstanceId: string | null) => {
    setSelectedRuntimeTokenInstanceId(tokenInstanceId);
  }, []);

  const handleMoveRuntimeToken = useCallback((
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
  }, []);

  const handleRemoveRuntimeToken = useCallback((tokenInstanceId: string) => {
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
  }, [setStatBlockPopupTokenInstanceId]);

  const handleRuntimeTokenDoubleClick = useCallback((tokenInstanceId: string) => {
    setSelectedRuntimeTokenInstanceId(tokenInstanceId);
    setStatBlockPopupTokenInstanceId(tokenInstanceId);
  }, [setStatBlockPopupTokenInstanceId]);

  return {
    runtimeTokens,
    setRuntimeTokens,
    selectedRuntimeTokenInstanceId,
    setSelectedRuntimeTokenInstanceId,
    resetTokenInstanceIdCounter,
    handleAddRuntimeToken,
    handleSelectRuntimeToken,
    handleMoveRuntimeToken,
    handleRemoveRuntimeToken,
    handleRuntimeTokenDoubleClick,
  };
}
