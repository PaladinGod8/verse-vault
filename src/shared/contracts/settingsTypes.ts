// App settings JSON-shape types stored inside `app_settings.config`.

export type AppThemePreference = 'light' | 'dark';
export type AppCardSize = 'small' | 'medium' | 'large';

/** Parsed shape of `AppSettings.config`. Add new preference fields here as features need them. */
export interface AppSettingsConfig {
  theme?: AppThemePreference;
  cardSize?: AppCardSize;
  [key: string]: unknown;
}
