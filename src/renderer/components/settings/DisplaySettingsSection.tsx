import type {
  AppCardSize,
  AppSettingsConfig,
  AppThemePreference,
} from '../../../shared/contracts/settingsTypes';

type DisplaySettingsSectionProps = {
  config: AppSettingsConfig;
  onChange: (patch: Partial<AppSettingsConfig>) => void;
};

const THEME_OPTIONS: Array<{ value: AppThemePreference; label: string; }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const CARD_SIZE_OPTIONS: Array<{ value: AppCardSize; label: string; }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

/**
 * First display-preference section. New preferences (e.g. card size variants,
 * density) get their own `<label>`/control pair here, reading and writing
 * through the same `config`/`onChange` pair the parent page supplies.
 */
export default function DisplaySettingsSection({ config, onChange }: DisplaySettingsSectionProps) {
  return (
    <section className='space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div>
        <h2 className='text-lg font-semibold text-slate-900'>Display</h2>
        <p className='mt-1 text-sm text-slate-600'>
          Visual preferences for app. Theme changes apply across renderer immediately.
        </p>
      </div>

      <div className='space-y-1'>
        <label htmlFor='settings-theme' className='block text-sm font-medium text-slate-700'>
          Theme
        </label>
        <select
          id='settings-theme'
          className='select select-bordered w-full max-w-xs'
          value={config.theme ?? 'dark'}
          onChange={(event) => onChange({ theme: event.target.value as AppThemePreference })}
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className='space-y-1'>
        <label htmlFor='settings-card-size' className='block text-sm font-medium text-slate-700'>
          Card size
        </label>
        <select
          id='settings-card-size'
          className='select select-bordered w-full max-w-xs'
          value={config.cardSize ?? 'medium'}
          onChange={(event) => onChange({ cardSize: event.target.value as AppCardSize })}
        >
          {CARD_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </section>
  );
}
