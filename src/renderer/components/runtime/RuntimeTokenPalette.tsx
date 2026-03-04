import { useMemo, useState, type MouseEvent } from 'react';
import type { RuntimeSceneToken } from './BattleMapRuntimeCanvas';

type RuntimeTokenPaletteProps = {
  campaigns: Campaign[];
  selectedCampaignId: number | null;
  isLoadingCampaigns: boolean;
  campaignLoadError: string | null;
  worldTokens: Token[];
  isLoadingWorldTokens: boolean;
  worldTokenLoadError: string | null;
  tokens: Token[];
  isLoadingTokens: boolean;
  tokenLoadError: string | null;
  placedTokens: RuntimeSceneToken[];
  selectedTokenInstanceId: string | null;
  showInvisibleTokens: boolean;
  onShowInvisibleTokensChange: (nextValue: boolean) => void;
  onSelectCampaign: (campaignId: number | null) => void;
  onAddToken: (token: Token) => void;
  onSelectPlacedToken: (tokenInstanceId: string) => void;
  onRemovePlacedToken: (tokenInstanceId: string) => void;
};

function tokenSourceKey(
  campaignId: number | null,
  sourceTokenId: number,
): string {
  if (campaignId === null) {
    return `world:${sourceTokenId}`;
  }
  return `campaign:${campaignId}:${sourceTokenId}`;
}

export default function RuntimeTokenPalette({
  campaigns,
  selectedCampaignId,
  isLoadingCampaigns,
  campaignLoadError,
  worldTokens,
  isLoadingWorldTokens,
  worldTokenLoadError,
  tokens,
  isLoadingTokens,
  tokenLoadError,
  placedTokens,
  selectedTokenInstanceId,
  showInvisibleTokens,
  onShowInvisibleTokensChange,
  onSelectCampaign,
  onAddToken,
  onSelectPlacedToken,
  onRemovePlacedToken,
}: RuntimeTokenPaletteProps) {
  const [hoveredTokenId, setHoveredTokenId] = useState<number | null>(null);
  const [hoveredTokenImageSrc, setHoveredTokenImageSrc] = useState<
    string | null
  >(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const filteredWorldTokens = useMemo(() => {
    const nextTokens = showInvisibleTokens
      ? worldTokens
      : worldTokens.filter((token) => token.is_visible === 1);
    return [...nextTokens].sort((a, b) => a.name.localeCompare(b.name));
  }, [showInvisibleTokens, worldTokens]);

  const filteredTokens = useMemo(() => {
    const nextTokens = showInvisibleTokens
      ? tokens
      : tokens.filter((token) => token.is_visible === 1);
    return [...nextTokens].sort((a, b) => a.name.localeCompare(b.name));
  }, [showInvisibleTokens, tokens]);

  const placedTokenSourceKeys = useMemo(() => {
    const sourceKeys = new Set<string>();
    for (const placedToken of placedTokens) {
      if (placedToken.sourceTokenId === null || placedToken.sourceMissing) {
        continue;
      }
      sourceKeys.add(
        tokenSourceKey(placedToken.campaignId, placedToken.sourceTokenId),
      );
    }
    return sourceKeys;
  }, [placedTokens]);

  const sortedPlacedTokens = useMemo(() => {
    return [...placedTokens].sort((left, right) => {
      if (left.sourceMissing !== right.sourceMissing) {
        return left.sourceMissing ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  }, [placedTokens]);

  const clearHoverPreview = () => {
    setHoveredTokenId(null);
    setHoveredTokenImageSrc(null);
    setTooltipPos(null);
  };

  const handleTokenMouseEnter = (
    event: MouseEvent<HTMLLIElement>,
    token: Token,
  ) => {
    const normalizedImageSrc =
      typeof token.image_src === 'string' ? token.image_src.trim() : '';
    if (!normalizedImageSrc) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredTokenId(token.id);
    setHoveredTokenImageSrc(normalizedImageSrc);
    setTooltipPos({
      x: rect.left - 160,
      y: rect.top,
    });
  };

  const renderTokenRow = (token: Token) => {
    const isPlaced = placedTokenSourceKeys.has(
      tokenSourceKey(token.campaign_id, token.id),
    );

    return (
      <li
        key={token.id}
        onMouseEnter={(event) => handleTokenMouseEnter(event, token)}
        onMouseLeave={clearHoverPreview}
        className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">
            {token.name}
          </p>
          <p className="text-xs text-slate-400">
            {token.is_visible === 1 ? 'Visible' : 'Invisible'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAddToken(token)}
          disabled={isPlaced}
          className="shrink-0 rounded border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaced ? 'Placed' : 'Add'}
        </button>
      </li>
    );
  };

  return (
    <section className="space-y-4 border-b border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
          Runtime Tokens
        </h2>
        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showInvisibleTokens}
            onChange={(event) =>
              onShowInvisibleTokensChange(event.target.checked)
            }
            className="size-3 rounded border-slate-600 bg-slate-950 text-slate-100"
          />
          Show invisible tokens
        </label>
      </div>

      <div className="space-y-4">
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <h3 className="text-xs font-medium tracking-wide text-slate-300 uppercase">
            World Tokens
          </h3>

          {isLoadingWorldTokens ? (
            <p className="text-xs text-slate-300">Loading world tokens...</p>
          ) : null}

          {worldTokenLoadError ? (
            <p className="text-xs text-rose-300">{worldTokenLoadError}</p>
          ) : null}

          {!isLoadingWorldTokens &&
          !worldTokenLoadError &&
          filteredWorldTokens.length === 0 ? (
            <p className="text-xs text-slate-400">No world tokens available.</p>
          ) : null}

          {!isLoadingWorldTokens &&
          !worldTokenLoadError &&
          filteredWorldTokens.length > 0 ? (
            <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {filteredWorldTokens.map((token) => renderTokenRow(token))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <label className="space-y-2">
              <span className="text-xs font-medium tracking-wide text-slate-300 uppercase">
                Campaign
              </span>
              <select
                value={selectedCampaignId ?? ''}
                onChange={(event) => {
                  const rawValue = event.target.value;
                  if (!rawValue) {
                    onSelectCampaign(null);
                    return;
                  }

                  const parsed = Number(rawValue);
                  if (Number.isInteger(parsed) && parsed > 0) {
                    onSelectCampaign(parsed);
                  }
                }}
                disabled={isLoadingCampaigns || campaigns.length === 0}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>

            {campaignLoadError ? (
              <p className="text-xs text-rose-300">{campaignLoadError}</p>
            ) : null}

            {isLoadingTokens ? (
              <p className="text-xs text-slate-300">
                Loading campaign tokens...
              </p>
            ) : null}

            {tokenLoadError ? (
              <p className="text-xs text-rose-300">{tokenLoadError}</p>
            ) : null}

            {!isLoadingTokens &&
            !tokenLoadError &&
            filteredTokens.length === 0 ? (
              <p className="text-xs text-slate-400">
                No tokens available for this campaign.
              </p>
            ) : null}

            {!isLoadingTokens && filteredTokens.length > 0 ? (
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {filteredTokens.map((token) => renderTokenRow(token))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="text-xs font-medium tracking-wide text-slate-300 uppercase">
              Scene Tokens ({placedTokens.length})
            </h3>

            {placedTokens.length === 0 ? (
              <p className="text-xs text-slate-400">
                Add world or campaign tokens to place them in runtime.
              </p>
            ) : null}

            {sortedPlacedTokens.length > 0 ? (
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {sortedPlacedTokens.map((token) => {
                  const isSelected =
                    selectedTokenInstanceId === token.instanceId;

                  return (
                    <li
                      key={token.instanceId}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-slate-800 bg-slate-900/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectPlacedToken(token.instanceId)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-slate-100">
                          {token.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {token.sourceMissing
                            ? 'Source missing'
                            : token.isVisible
                              ? 'Visible'
                              : 'Invisible'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemovePlacedToken(token.instanceId)}
                        className="shrink-0 rounded border border-rose-600/70 px-2 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-500 hover:text-rose-100"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {hoveredTokenId !== null && hoveredTokenImageSrc && tooltipPos ? (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl"
          style={{
            left: Math.max(8, tooltipPos.x),
            top: Math.max(8, tooltipPos.y),
          }}
        >
          <img
            key={hoveredTokenId}
            src={hoveredTokenImageSrc}
            alt=""
            className="h-36 w-36 rounded object-cover"
            onError={clearHoverPreview}
          />
        </div>
      ) : null}
    </section>
  );
}
