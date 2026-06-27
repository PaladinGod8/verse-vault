import type {
  AppCardSize,
  AppSettingsConfig,
  AppThemePreference,
} from '../../../shared/contracts/settingsTypes';
import {
  buildCustomThemeCssVariables,
  resolveThemeColorHex,
} from '../../lib/themeCustomization';
import ThemeColorRoleControl from './ThemeColorRoleControl';

type DisplaySettingsSectionProps = {
  config: AppSettingsConfig;
  onChange: (patch: Partial<AppSettingsConfig>) => void;
};

const THEME_OPTIONS: Array<{ value: AppThemePreference; label: string; }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'custom', label: 'Custom' },
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
  const themeColors = config.themeColors;
  const isCustomTheme = (config.theme ?? 'dark') === 'custom';
  const previewVariables = isCustomTheme
    ? buildCustomThemeCssVariables(themeColors)
    : null;
  const previewPrimary = previewVariables?.['--color-primary']
    ?? resolveThemeColorHex('primary', themeColors);
  const previewSecondary = previewVariables?.['--color-secondary']
    ?? resolveThemeColorHex('secondary', themeColors);
  const previewAccent = previewVariables?.['--color-accent']
    ?? resolveThemeColorHex('accent', themeColors);

  return (
    <section className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
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
        <p className='text-sm text-slate-600'>
          Custom theme keeps dark surfaces and derives matching component colors from one seed.
        </p>
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

      {isCustomTheme
        ? (
          <>
            <section className='space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4'>
              <div className='space-y-1'>
                <h3 className='text-base font-semibold text-slate-900'>Theme preview</h3>
                <p className='text-sm text-slate-600'>
                  Pick one color. Verse Vault keeps dark background and derives matching support
                  and accent shades around it.
                </p>
              </div>

              <div className='grid gap-4 lg:grid-cols-[1.2fr,0.8fr]'>
                <article className='space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
                  <div className='flex flex-wrap items-center gap-3'>
                    <button
                      type='button'
                      className='rounded-lg px-4 py-2 text-sm font-semibold shadow-sm'
                      style={{
                        backgroundColor: previewPrimary,
                        color: 'var(--color-primary-content)',
                      }}
                    >
                      Primary action
                    </button>
                    <button
                      type='button'
                      className='rounded-lg px-4 py-2 text-sm font-semibold shadow-sm'
                      style={{
                        backgroundColor: previewSecondary,
                        color: 'var(--color-secondary-content)',
                      }}
                    >
                      Secondary action
                    </button>
                    <span
                      className='rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm'
                      style={{
                        backgroundColor: previewAccent,
                        color: 'var(--color-accent-content)',
                      }}
                    >
                      Accent
                    </span>
                  </div>

                  <div className='space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4'>
                    <h4 className='text-sm font-semibold text-slate-900'>Component sample</h4>
                    <p className='text-sm text-slate-700'>
                      Preview body copy with
                      {' '}
                      <span style={{ color: previewPrimary }} className='font-semibold'>
                        primary
                      </span>
                      ,
                      {' '}
                      <span style={{ color: previewSecondary }} className='font-semibold'>
                        secondary
                      </span>
                      , and
                      {' '}
                      <span style={{ color: previewAccent }} className='font-semibold'>
                        accent
                      </span>
                      {' '}
                      emphasis.
                    </p>
                  </div>
                </article>

                <article className='space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
                  <h4 className='text-sm font-semibold text-slate-900'>Derived palette</h4>
                  <div className='space-y-2 text-sm text-slate-700'>
                    <div className='flex items-center justify-between gap-3'>
                      <span>Primary</span>
                      <code className='rounded bg-slate-100 px-2 py-1 text-xs'>
                        {previewPrimary}
                      </code>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span>Secondary</span>
                      <code className='rounded bg-slate-100 px-2 py-1 text-xs'>
                        {previewSecondary}
                      </code>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span>Accent</span>
                      <code className='rounded bg-slate-100 px-2 py-1 text-xs'>
                        {previewAccent}
                      </code>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section className='space-y-4'>
              <div className='space-y-1'>
                <h3 className='text-base font-semibold text-slate-900'>Theme color</h3>
                <p className='text-sm text-slate-600'>
                  Choose preset palette or custom hex. Other component colors derive from this
                  seed automatically.
                </p>
              </div>

              <ThemeColorRoleControl
                role='primary'
                label='Theme color'
                description='Seed color for buttons, highlights, and related dark-theme accents.'
                themeColors={themeColors}
                onChange={(nextThemeColors) => onChange({ themeColors: nextThemeColors })}
              />
            </section>
          </>
        )
        : null}
    </section>
  );
}
