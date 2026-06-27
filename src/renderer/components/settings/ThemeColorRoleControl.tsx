import { useEffect, useState } from 'react';
import type {
  AppThemeColorRole,
  AppThemeColors,
  AppThemePalette,
} from '../../../shared/contracts/settingsTypes';
import {
  normalizeHexColor,
  resolveThemeColorHex,
  THEME_PALETTE_OPTIONS,
} from '../../lib/themeCustomization';

type ThemeColorRoleControlProps = {
  role: AppThemeColorRole;
  label: string;
  description: string;
  themeColors: AppThemeColors | undefined;
  onChange: (themeColors: AppThemeColors) => void;
};

export default function ThemeColorRoleControl({
  role,
  label,
  description,
  themeColors,
  onChange,
}: ThemeColorRoleControlProps) {
  const selection = themeColors?.[role];
  const resolvedHex = resolveThemeColorHex(role, themeColors);
  const [hexDraft, setHexDraft] = useState(selection?.customHex ?? resolvedHex);

  useEffect(() => {
    setHexDraft(selection?.customHex ?? resolvedHex);
  }, [resolvedHex, selection?.customHex]);

  const applyPalette = (palette: AppThemePalette) => {
    if (palette === 'custom') {
      const customHex = normalizeHexColor(selection?.customHex) ?? resolvedHex;
      setHexDraft(customHex);
      onChange({
        ...(themeColors ?? {}),
        [role]: {
          palette: 'custom',
          customHex,
        },
      });
      return;
    }

    onChange({
      ...(themeColors ?? {}),
      [role]: { palette },
    });
  };

  const handleCustomHexChange = (nextValue: string) => {
    setHexDraft(nextValue);

    const normalized = normalizeHexColor(nextValue);
    if (!normalized) {
      return;
    }

    onChange({
      ...(themeColors ?? {}),
      [role]: {
        palette: 'custom',
        customHex: normalized,
      },
    });
  };

  return (
    <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4'>
      <div className='space-y-1'>
        <h4 className='text-sm font-semibold text-slate-900'>{label}</h4>
        <p className='text-sm text-slate-600'>{description}</p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {THEME_PALETTE_OPTIONS.map((option) => {
          const isActive = selection?.palette === option.value;

          return (
            <button
              key={`${role}-${option.value}`}
              type='button'
              aria-pressed={isActive}
              className={[
                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'border-slate-900 text-slate-900 shadow-sm'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-white',
              ].join(' ')}
              onClick={() => applyPalette(option.value)}
            >
              <span
                aria-hidden='true'
                className='h-3 w-3 rounded-full border border-black/10'
                style={{ backgroundColor: option.value === 'custom' ? hexDraft : option.hex }}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      {selection?.palette === 'custom'
        ? (
          <div className='grid gap-3 md:grid-cols-[auto,1fr] md:items-center'>
            <label className='flex items-center gap-3 text-sm font-medium text-slate-700'>
              <span>{label} picker</span>
              <input
                aria-label={`${label} custom color picker`}
                type='color'
                className='h-10 w-16 cursor-pointer rounded border border-slate-300 bg-white p-1'
                value={normalizeHexColor(hexDraft) ?? resolvedHex}
                onChange={(event) => handleCustomHexChange(event.target.value)}
              />
            </label>

            <label className='space-y-1 text-sm font-medium text-slate-700'>
              <span>{label} custom hex color</span>
              <input
                aria-label={`${label} custom hex color`}
                type='text'
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
                inputMode='text'
                placeholder='#2563eb'
                value={hexDraft}
                onChange={(event) => handleCustomHexChange(event.target.value)}
              />
            </label>
          </div>
        )
        : null}
    </div>
  );
}
