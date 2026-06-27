import { useCallback, useMemo } from 'react';
import { Link, useBeforeUnload, useNavigate, useParams } from 'react-router-dom';
import AbilityPickerPanel from '../components/runtime/AbilityPickerPanel';
import BattleMapRuntimeCanvas from '../components/runtime/BattleMapRuntimeCanvas';
import RuntimeGridControls from '../components/runtime/RuntimeGridControls';
import RuntimeTokenPalette from '../components/runtime/RuntimeTokenPalette';
import StatBlockPopup from '../components/runtime/StatBlockPopup';
import useBattleMapRuntimeBootstrap from '../hooks/useBattleMapRuntimeBootstrap';
import useBattleMapRuntimeCampaignData from '../hooks/useBattleMapRuntimeCampaignData';
import useBattleMapRuntimeScreenState from '../hooks/useBattleMapRuntimeScreenState';
import useRuntimeTokens from '../hooks/useRuntimeTokens';
import useRuntimeTokenSelection from '../hooks/useRuntimeTokenSelection';
import { parsePositiveIntParam } from '../lib/routeParams';

const UNSAVED_RUNTIME_CONFIRMATION_MESSAGE =
  'Some runtime changes are still unsaved. Exit runtime and discard those changes?';

export default function BattleMapRuntimePage() {
  const navigate = useNavigate();
  const { id, battleMapId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedBattleMapId = useMemo(
    () => parsePositiveIntParam(battleMapId),
    [battleMapId],
  );
  const battleMapsRoute = worldId !== null ? `/world/${worldId}/battlemaps` : '/';

  const runtimeScreenState = useBattleMapRuntimeScreenState();
  const {
    selectedCampaignId,
    setSelectedCampaignId,
    showInvisibleTokens,
    setShowInvisibleTokens,
    castingAbility,
    setCastingAbility,
    castingAngleRad,
    setCastingAngleRad,
    statBlockPopupTokenInstanceId,
    setStatBlockPopupTokenInstanceId,
    resetRuntimeScreenState,
  } = runtimeScreenState;

  const runtimeTokensController = useRuntimeTokens(
    setStatBlockPopupTokenInstanceId,
  );
  const {
    runtimeTokens,
    setRuntimeTokens,
    selectedRuntimeTokenInstanceId,
    setSelectedRuntimeTokenInstanceId,
    resetTokenInstanceIdCounter,
    handleAddRuntimeToken: addRuntimeToken,
    handleSelectRuntimeToken,
    handleMoveRuntimeToken,
    handleRemoveRuntimeToken,
    handleRuntimeTokenDoubleClick,
  } = runtimeTokensController;

  const {
    battleMap,
    runtimeConfig,
    isLoading,
    error,
    isSavingRuntimeConfig,
    runtimeSaveError,
    hasPendingRuntimeChanges,
    flushRuntimePersistence,
    handleGridConfigChange,
  } = useBattleMapRuntimeBootstrap({
    worldId,
    parsedBattleMapId,
    setRuntimeTokens,
    setSelectedRuntimeTokenInstanceId,
    resetTokenInstanceIdCounter,
    resetRuntimeScreenState,
  });

  const {
    campaigns,
    isLoadingCampaigns,
    campaignLoadError,
    worldTokens,
    isLoadingWorldTokens,
    worldTokenLoadError,
    campaignTokens,
    isLoadingCampaignTokens,
    campaignTokenLoadError,
  } = useBattleMapRuntimeCampaignData({
    worldId,
    selectedCampaignId,
    setSelectedCampaignId,
    setRuntimeTokens,
  });

  useRuntimeTokenSelection({
    runtimeTokens,
    selectedRuntimeTokenInstanceId,
    setSelectedRuntimeTokenInstanceId,
    statBlockPopupTokenInstanceId,
    setStatBlockPopupTokenInstanceId,
    setCastingAbility,
  });

  const selectedToken = useMemo(
    () =>
      runtimeTokens.find(
        (token) => token.instanceId === selectedRuntimeTokenInstanceId,
      ) ?? null,
    [runtimeTokens, selectedRuntimeTokenInstanceId],
  );
  const popupToken = useMemo(
    () =>
      runtimeTokens.find(
        (token) => token.instanceId === statBlockPopupTokenInstanceId,
      ) ?? null,
    [runtimeTokens, statBlockPopupTokenInstanceId],
  );

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

  const handleAddRuntimeToken = (token: Token) => {
    if (!runtimeConfig) {
      return;
    }

    addRuntimeToken(token, runtimeConfig);
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
                activeGridMode={runtimeConfig?.grid.mode ?? 'square'}
                onShowInvisibleTokensChange={setShowInvisibleTokens}
                onSelectCampaign={setSelectedCampaignId}
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
