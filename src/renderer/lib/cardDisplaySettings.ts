import type {
  AppCardDisplayDimensions,
  AppCardDisplaySettings,
  AppCardDisplaySurface,
  AppSettingsConfig,
} from '../../shared/contracts/settingsTypes';

type ResolvedCardDisplayDimensions = {
  width: number;
  height: number;
  lockAspectRatio: boolean;
};

export const CARD_DISPLAY_DIMENSION_LIMITS = {
  min: 48,
  max: 640,
} as const;

export const DEFAULT_CARD_DISPLAY_SETTINGS: Record<
  AppCardDisplaySurface,
  ResolvedCardDisplayDimensions
> = {
  characterCard: { width: 320, height: 160, lockAspectRatio: true },
  factionCard: { width: 320, height: 160, lockAspectRatio: true },
  characterDetail: { width: 96, height: 96, lockAspectRatio: true },
  factionDetail: { width: 96, height: 96, lockAspectRatio: true },
};

export function clampCardDisplayDimension(value: number): number {
  return Math.min(
    Math.max(Math.round(value), CARD_DISPLAY_DIMENSION_LIMITS.min),
    CARD_DISPLAY_DIMENSION_LIMITS.max,
  );
}

export function resolveCardDisplayDimensions(
  config: AppSettingsConfig,
  surface: AppCardDisplaySurface,
): ResolvedCardDisplayDimensions {
  const stored = config.cardDisplays?.[surface];
  const fallback = DEFAULT_CARD_DISPLAY_SETTINGS[surface];

  return {
    width: normalizeDimension(stored?.width, fallback.width),
    height: normalizeDimension(stored?.height, fallback.height),
    lockAspectRatio: stored?.lockAspectRatio ?? fallback.lockAspectRatio,
  };
}

export function updateCardDisplaySettings(
  current: AppCardDisplaySettings | undefined,
  surface: AppCardDisplaySurface,
  patch: AppCardDisplayDimensions,
): AppCardDisplaySettings {
  return {
    ...(current ?? {}),
    [surface]: {
      ...(current?.[surface] ?? {}),
      ...patch,
    },
  };
}

export function applyAspectRatio(
  surface: AppCardDisplaySurface,
  dimensions: Pick<ResolvedCardDisplayDimensions, 'width' | 'height'>,
  changed: 'width' | 'height',
): ResolvedCardDisplayDimensions {
  const fallback = DEFAULT_CARD_DISPLAY_SETTINGS[surface];
  const aspectRatio = fallback.width / fallback.height;
  const width = clampCardDisplayDimension(dimensions.width);
  const height = clampCardDisplayDimension(dimensions.height);

  if (changed === 'width') {
    const nextHeight = clampCardDisplayDimension(width / aspectRatio);
    return { width, height: nextHeight, lockAspectRatio: true };
  }

  const nextWidth = clampCardDisplayDimension(height * aspectRatio);
  return { width: nextWidth, height, lockAspectRatio: true };
}

export function buildCardFrameStyle(dimensions: Pick<ResolvedCardDisplayDimensions, 'width'>) {
  return {
    width: '100%',
    maxWidth: `${dimensions.width}px`,
  } as const;
}

export function buildCardMediaStyle(dimensions: Pick<ResolvedCardDisplayDimensions, 'height'>) {
  return {
    height: `${dimensions.height}px`,
  } as const;
}

export function buildDetailImageStyle(
  dimensions: Pick<ResolvedCardDisplayDimensions, 'width' | 'height'>,
) {
  return {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    maxWidth: '100%',
  } as const;
}

function normalizeDimension(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clampCardDisplayDimension(value);
}
