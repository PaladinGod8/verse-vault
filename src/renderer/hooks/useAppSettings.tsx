import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppSettingsConfig,
  AppThemePreference,
} from '../../shared/contracts/settingsTypes';
import {
  applyThemeToDocument,
  mergeAppSettingsConfig,
  resolveAppTheme,
} from '../lib/themeCustomization';

type AppSettingsContextValue = {
  config: AppSettingsConfig;
  isLoading: boolean;
  loadError: string | null;
  theme: AppThemePreference;
  updateConfig: (patch: Partial<AppSettingsConfig>) => Promise<AppSettingsConfig>;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

/** Loads, parses, persists, and applies singleton app settings via `window.db.settings`. */
export function AppSettingsProvider({ children }: { children: ReactNode; }) {
  const [config, setConfig] = useState<AppSettingsConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const settings = await window.db.settings.get();
        if (isMounted) {
          setConfig(parseConfig(settings.config));
          setLoadError(null);
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load settings right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateConfig = async (patch: Partial<AppSettingsConfig>) => {
    const previousConfig = configRef.current;
    const nextConfig = mergeAppSettingsConfig(previousConfig, patch);

    configRef.current = nextConfig;
    setConfig(nextConfig);

    try {
      const settings = await window.db.settings.update(JSON.stringify(nextConfig));
      const parsed = parseConfig(settings.config);
      configRef.current = parsed;
      setConfig(parsed);
      return parsed;
    } catch (error) {
      configRef.current = previousConfig;
      setConfig(previousConfig);
      throw error;
    }
  };

  const theme = resolveAppTheme(config);

  useEffect(() => {
    applyThemeToDocument(config, document.documentElement);
  }, [config]);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      config,
      isLoading,
      loadError,
      theme,
      updateConfig,
    }),
    [config, isLoading, loadError, theme],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

/** App-wide settings access. Requires `AppSettingsProvider` in renderer tree. */
export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider.');
  }

  return context;
}

function parseConfig(raw: string): AppSettingsConfig {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
