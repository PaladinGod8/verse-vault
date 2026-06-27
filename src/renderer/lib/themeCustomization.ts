import type {
  AppSettingsConfig,
  AppThemeColorRole,
  AppThemeColors,
  AppThemePalette,
  AppThemePreference,
} from '../../shared/contracts/settingsTypes';

type ThemePaletteOption = {
  label: string;
  value: AppThemePalette;
  hex: string;
};

type ThemeRoleDefinition = {
  key: AppThemeColorRole;
  label: string;
  description: string;
  defaultHex: string;
};

type AppliedTheme = {
  cssVariables: Record<string, string>;
  dataTheme: 'versevault-light' | 'versevault-dark';
  colorScheme: 'light' | 'dark';
};

const DARK_TEXT = '#0f172a';
const LIGHT_TEXT = '#f8fafc';

export const THEME_PALETTE_OPTIONS: ThemePaletteOption[] = [
  { label: 'Slate', value: 'slate', hex: '#475569' },
  { label: 'Red', value: 'red', hex: '#dc2626' },
  { label: 'Orange', value: 'orange', hex: '#ea580c' },
  { label: 'Yellow', value: 'yellow', hex: '#ca8a04' },
  { label: 'Green', value: 'green', hex: '#16a34a' },
  { label: 'Teal', value: 'teal', hex: '#0d9488' },
  { label: 'Blue', value: 'blue', hex: '#2563eb' },
  { label: 'Indigo', value: 'indigo', hex: '#4f46e5' },
  { label: 'Purple', value: 'purple', hex: '#7c3aed' },
  { label: 'Pink', value: 'pink', hex: '#db2777' },
  { label: 'Custom color', value: 'custom', hex: '#2563eb' },
];

export const THEME_ROLE_DEFINITIONS: ThemeRoleDefinition[] = [
  {
    key: 'primary',
    label: 'Primary',
    description: 'Main action buttons and strongest emphasis.',
    defaultHex: '#2563eb',
  },
  {
    key: 'secondary',
    label: 'Secondary',
    description: 'Supporting actions, chips, and softer emphasis.',
    defaultHex: '#475569',
  },
  {
    key: 'accent',
    label: 'Accent',
    description: 'Highlights, focus moments, and callout color.',
    defaultHex: '#db2777',
  },
];

export const THEME_CSS_VARIABLES = [
  '--color-base-100',
  '--color-base-200',
  '--color-base-300',
  '--color-base-content',
  '--color-primary',
  '--color-primary-content',
  '--color-secondary',
  '--color-secondary-content',
  '--color-accent',
  '--color-accent-content',
  '--color-neutral',
  '--color-neutral-content',
] as const;

const PALETTE_HEX_BY_VALUE = Object.fromEntries(
  THEME_PALETTE_OPTIONS.map((option) => [option.value, option.hex]),
) as Record<AppThemePalette, string>;

const ROLE_DEFAULT_HEX_BY_KEY = Object.fromEntries(
  THEME_ROLE_DEFINITIONS.map((role) => [role.key, role.defaultHex]),
) as Record<AppThemeColorRole, string>;

type HslColor = {
  hue: number;
  saturation: number;
  lightness: number;
};

export function mergeAppSettingsConfig(
  current: AppSettingsConfig,
  patch: Partial<AppSettingsConfig>,
): AppSettingsConfig {
  const nextCardDisplays = patch.cardDisplays
    ? {
      ...(current.cardDisplays ?? {}),
      ...patch.cardDisplays,
    }
    : current.cardDisplays;
  const nextThemeColors = patch.themeColors
    ? {
      ...(current.themeColors ?? {}),
      ...patch.themeColors,
    }
    : current.themeColors;

  const nextConfig = {
    ...current,
    ...patch,
  };

  if (nextThemeColors) {
    nextConfig.themeColors = nextThemeColors;
  }

  if (nextCardDisplays) {
    nextConfig.cardDisplays = nextCardDisplays;
  }

  return nextConfig;
}

export function resolveAppTheme(config: AppSettingsConfig): AppThemePreference {
  if (config.theme === 'light' || config.theme === 'custom') {
    return config.theme;
  }

  return 'dark';
}

export function buildAppliedTheme(config: AppSettingsConfig): AppliedTheme {
  const theme = resolveAppTheme(config);

  if (theme === 'custom') {
    return {
      cssVariables: buildCustomThemeCssVariables(config.themeColors),
      colorScheme: 'dark',
      dataTheme: 'versevault-dark',
    };
  }

  return {
    cssVariables: {},
    colorScheme: theme,
    dataTheme: theme === 'dark' ? 'versevault-dark' : 'versevault-light',
  };
}

export function applyThemeToDocument(config: AppSettingsConfig, root: HTMLElement): void {
  const appliedTheme = buildAppliedTheme(config);

  root.setAttribute('data-theme', appliedTheme.dataTheme);
  root.style.colorScheme = appliedTheme.colorScheme;

  for (const variableName of THEME_CSS_VARIABLES) {
    root.style.removeProperty(variableName);
  }

  for (const [variableName, value] of Object.entries(appliedTheme.cssVariables)) {
    root.style.setProperty(variableName, value);
  }
}

export function resolveThemeColorHex(
  role: AppThemeColorRole,
  themeColors: AppThemeColors | undefined,
): string {
  const selection = themeColors?.[role];

  if (!selection) {
    return ROLE_DEFAULT_HEX_BY_KEY[role];
  }

  if (selection.palette === 'custom') {
    return normalizeHexColor(selection.customHex) ?? ROLE_DEFAULT_HEX_BY_KEY[role];
  }

  return PALETTE_HEX_BY_VALUE[selection.palette];
}

export function normalizeHexColor(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const value = raw.trim();
  const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(value);

  if (shortHexMatch) {
    const expanded = shortHexMatch[1]
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
      .toLowerCase();
    return `#${expanded}`;
  }

  const longHexMatch = /^#([0-9a-fA-F]{6})$/.exec(value);
  return longHexMatch ? `#${longHexMatch[1].toLowerCase()}` : null;
}

export function getReadableTextColor(hex: string): string {
  const normalized = normalizeHexColor(hex);

  if (!normalized) {
    return LIGHT_TEXT;
  }

  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * red) + (0.587 * green) + (0.114 * blue);

  return luminance >= 160 ? DARK_TEXT : LIGHT_TEXT;
}

function buildThemeCssVariables(themeColors: AppThemeColors | undefined): Record<string, string> {
  const seedHex = resolveCustomThemeSeed(themeColors);
  const primary = tuneSeedHex(seedHex);
  const primaryHsl = hexToHsl(primary) ?? { hue: 218, saturation: 84, lightness: 56 };
  const neutral = hslToHex({
    hue: primaryHsl.hue,
    saturation: clamp(primaryHsl.saturation * 0.45, 12, 28),
    lightness: clamp(primaryHsl.lightness - 47, 6, 13),
  });
  const base100 = hslToHex({
    hue: primaryHsl.hue,
    saturation: clamp(primaryHsl.saturation * 0.36, 10, 24),
    lightness: clamp(primaryHsl.lightness - 39, 10, 18),
  });
  const base200 = hslToHex({
    hue: primaryHsl.hue,
    saturation: clamp(primaryHsl.saturation * 0.34, 9, 22),
    lightness: clamp(primaryHsl.lightness - 36, 12, 20),
  });
  const base300 = hslToHex({
    hue: primaryHsl.hue,
    saturation: clamp(primaryHsl.saturation * 0.32, 8, 20),
    lightness: clamp(primaryHsl.lightness - 31, 16, 24),
  });
  const secondary = hslToHex({
    hue: primaryHsl.hue,
    saturation: clamp(primaryHsl.saturation * 0.42, 18, 46),
    lightness: clamp(primaryHsl.lightness - 27, 26, 40),
  });
  const accent = hslToHex({
    hue: primaryHsl.hue,
    saturation: clamp(primaryHsl.saturation + 8, 66, 96),
    lightness: clamp(primaryHsl.lightness + 10, 60, 76),
  });

  return {
    '--color-base-100': base100,
    '--color-base-200': base200,
    '--color-base-300': base300,
    '--color-base-content': '#e5e7eb',
    '--color-primary': primary,
    '--color-primary-content': getReadableTextColor(primary),
    '--color-secondary': secondary,
    '--color-secondary-content': getReadableTextColor(secondary),
    '--color-accent': accent,
    '--color-accent-content': getReadableTextColor(accent),
    '--color-neutral': neutral,
    '--color-neutral-content': '#f3f4f6',
  };
}

export function buildCustomThemeCssVariables(
  themeColors: AppThemeColors | undefined,
): Record<string, string> {
  return buildThemeCssVariables(themeColors);
}

function resolveCustomThemeSeed(themeColors: AppThemeColors | undefined): string {
  const seedSelection = themeColors?.primary
    ?? themeColors?.accent
    ?? themeColors?.secondary;

  if (!seedSelection) {
    return ROLE_DEFAULT_HEX_BY_KEY.primary;
  }

  if (seedSelection.palette === 'custom') {
    return normalizeHexColor(seedSelection.customHex) ?? ROLE_DEFAULT_HEX_BY_KEY.primary;
  }

  return PALETTE_HEX_BY_VALUE[seedSelection.palette];
}

function tuneSeedHex(hex: string): string {
  return normalizeHexColor(hex) ?? ROLE_DEFAULT_HEX_BY_KEY.primary;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hexToHsl(hex: string): HslColor | null {
  const normalized = normalizeHexColor(hex);

  if (!normalized) {
    return null;
  }

  const red = parseInt(normalized.slice(1, 3), 16) / 255;
  const green = parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return {
      hue: 0,
      saturation: 0,
      lightness: lightness * 100,
    };
  }

  const saturation = delta / (1 - Math.abs((2 * lightness) - 1));
  let hue = 0;

  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = ((blue - red) / delta) + 2;
  } else {
    hue = ((red - green) / delta) + 4;
  }

  return {
    hue: (hue * 60 + 360) % 360,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function hslToHex({ hue, saturation, lightness }: HslColor): string {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const normalizedLightness = clamp(lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs((2 * normalizedLightness) - 1)) * normalizedSaturation;
  const segment = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = normalizedLightness - (chroma / 2);

  return rgbToHex(red + match, green + match, blue + match);
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${
    [red, green, blue]
      .map((channel) => Math.round(clamp(channel * 255, 0, 255)).toString(16).padStart(2, '0'))
      .join('')
  }`;
}
