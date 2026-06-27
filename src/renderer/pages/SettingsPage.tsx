import { Link } from 'react-router-dom';
import type { AppSettingsConfig } from '../../shared/contracts/settingsTypes';
import DisplaySettingsSection from '../components/settings/DisplaySettingsSection';
import { useToast } from '../components/ui/ToastProvider';
import { useAppSettings } from '../hooks/useAppSettings';

/**
 * Global, app-wide settings page (not world-scoped). New preference groups
 * get their own section component here, alongside DisplaySettingsSection.
 */
export default function SettingsPage() {
  const { config, isLoading, loadError, updateConfig } = useAppSettings();
  const toast = useToast();

  const handleChange = async (patch: Partial<AppSettingsConfig>) => {
    try {
      await updateConfig(patch);
    } catch (err) {
      toast.error(
        'Failed to save settings.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  };

  return (
    <main className='space-y-6'>
      <header className='space-y-1'>
        <Link to='/' className='text-sm text-slate-600 hover:text-slate-900'>
          &larr; Back to worlds
        </Link>
        <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>Settings</h1>
        <p className='text-sm text-slate-600'>App-wide preferences, independent of any world.</p>
      </header>

      {isLoading
        ? (
          <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
            Loading settings...
          </section>
        )
        : null}

      {!isLoading && loadError
        ? (
          <section className='rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm'>
            {loadError}
          </section>
        )
        : null}

      {!isLoading && !loadError
        ? <DisplaySettingsSection config={config} onChange={handleChange} />
        : null}
    </main>
  );
}
