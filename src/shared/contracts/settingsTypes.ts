// App settings JSON-shape types stored inside `app_settings.config`.

export type AppThemePreference = 'light' | 'dark' | 'custom';
export type AppCardSize = 'small' | 'medium' | 'large';
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

/** Parsed shape of `AppSettings.config`. Add new preference fields here as features need them. */
export interface AppSettingsConfig {
  theme?: AppThemePreference;
  cardSize?: AppCardSize;
  themeColors?: AppThemeColors;
  [key: string]: unknown;
}
