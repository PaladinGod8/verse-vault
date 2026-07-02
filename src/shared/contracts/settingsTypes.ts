// App settings JSON-shape types stored inside `app_settings.config`.

export type AppThemePreference = 'light' | 'dark' | 'custom';
export type AppCardSize = 'small' | 'medium' | 'large';
export type CardSortMethod = 'alphabetical' | 'recentlyViewed';
export type CardSortListKey = 'backgrounds' | 'characters' | 'factions' | 'worlds';
export type CardSortPreferences = Partial<Record<CardSortListKey, CardSortMethod>>;
export type AppCardDisplaySurface =
  | 'backgroundCard'
  | 'backgroundDetail'
  | 'characterCard'
  | 'factionCard'
  | 'characterDetail'
  | 'factionDetail';
export type AppThemeColorRole = 'primary' | 'secondary' | 'accent';
export type AppThemePalette =
  | 'slate'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'custom';

export interface AppThemeColorSelection {
  palette: AppThemePalette;
  customHex?: string;
}

export type AppThemeColors = Partial<Record<AppThemeColorRole, AppThemeColorSelection>>;
export interface AppCardDisplayDimensions {
  width?: number;
  height?: number;
  lockAspectRatio?: boolean;
}

export type AppCardDisplaySettings = Partial<
  Record<AppCardDisplaySurface, AppCardDisplayDimensions>
>;

/** Parsed shape of `AppSettings.config`. Add new preference fields here as features need them. */
export interface AppSettingsConfig {
  theme?: AppThemePreference;
  cardSize?: AppCardSize;
  cardDisplays?: AppCardDisplaySettings;
  themeColors?: AppThemeColors;
  cardSortPreferences?: CardSortPreferences;
  [key: string]: unknown;
}
