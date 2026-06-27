import { useEffect, useState } from 'react';
import type { AppSettingsConfig } from '../../shared/contracts/settingsTypes';

/** Loads, parses, and persists the singleton app settings row via `window.db.settings`. */
export function useAppSettings() {
  const [config, setConfig] = useState<AppSettingsConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const settings = await window.db.settings.get();
        if (isMounted) {
          setConfig(parseConfig(settings.config));
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

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateConfig = async (patch: Partial<AppSettingsConfig>) => {
    const nextConfig = { ...config, ...patch };
    const settings = await window.db.settings.update(JSON.stringify(nextConfig));
    setConfig(parseConfig(settings.config));
  };

  return { config, isLoading, loadError, updateConfig };
}

function parseConfig(raw: string): AppSettingsConfig {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
