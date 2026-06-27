import { useState } from 'react';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useToast } from '../ui/ToastProvider';

export default function AppThemeToggle() {
  const { theme, updateConfig } = useAppSettings();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  const handleToggle = async () => {
    setIsSaving(true);

    try {
      await updateConfig({ theme: nextTheme });
    } catch (err) {
      toast.error(
        'Failed to save theme.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type='button'
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      className='rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
      onClick={() => {
        void handleToggle();
      }}
      disabled={isSaving}
    >
      {theme === 'dark' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
