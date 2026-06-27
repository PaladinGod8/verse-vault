import { type Dispatch, type SetStateAction, useEffect } from 'react';
import type { RuntimeSceneToken } from '../lib/runtime/runtimeCanvasTypes';

/**
 * Enforces the invariants between runtime tokens, the current selection,
 * the statblock popup, and an in-progress ability cast: if the token a
 * piece of UI references gets removed, that UI must close rather than
 * point at a stale instance id.
 */
export default function useRuntimeTokenSelection({
  runtimeTokens,
  selectedRuntimeTokenInstanceId,
  setSelectedRuntimeTokenInstanceId,
  statBlockPopupTokenInstanceId,
  setStatBlockPopupTokenInstanceId,
  setCastingAbility,
}: {
  runtimeTokens: RuntimeSceneToken[];
  selectedRuntimeTokenInstanceId: string | null;
  setSelectedRuntimeTokenInstanceId: Dispatch<SetStateAction<string | null>>;
  statBlockPopupTokenInstanceId: string | null;
  setStatBlockPopupTokenInstanceId: Dispatch<SetStateAction<string | null>>;
  setCastingAbility: Dispatch<SetStateAction<Ability | null>>;
}): void {
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
  }, [runtimeTokens, selectedRuntimeTokenInstanceId, setSelectedRuntimeTokenInstanceId]);

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
  }, [runtimeTokens, statBlockPopupTokenInstanceId, setStatBlockPopupTokenInstanceId]);

  useEffect(() => {
    if (
      statBlockPopupTokenInstanceId !== null
      && statBlockPopupTokenInstanceId !== selectedRuntimeTokenInstanceId
    ) {
      setStatBlockPopupTokenInstanceId(null);
    }
  }, [
    selectedRuntimeTokenInstanceId,
    statBlockPopupTokenInstanceId,
    setStatBlockPopupTokenInstanceId,
  ]);

  useEffect(() => {
    setCastingAbility(null);
  }, [selectedRuntimeTokenInstanceId, setCastingAbility]);
}
