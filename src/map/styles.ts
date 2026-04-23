import type { MapStyleOptions, Nation } from '../types/public';

// ── RCPCH brand tokens ────────────────────────────────────────────────────────

export const RCPCH_DARK_BLUE = '#0d0d58';
export const RCPCH_PINK = '#e00087';
export const RCPCH_PINK_DARK = '#7a0036';
export const RCPCH_LIGHT_BLUE = '#41b6e6';
export const RCPCH_CHARCOAL = '#3d3d3d';

// ── Color ramp generation ─────────────────────────────────────────────────────

export const DEFAULT_BASE_COLORS_BY_NATION: Record<Nation, string> = {
  england: '#d7191c',
  wales: '#1a9641',
  scotland: '#2b83ba',
  northern_ireland: '#7f7f7f',
  all: '#d7191c',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex: string): string | null {
  const clean = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    const r = clean[1];
    const g = clean[2];
    const b = clean[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hp >= 0 && hp < 1) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hp < 2) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hp < 3) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hp < 4) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hp < 5) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const m = l - c / 2;
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

/**
 * Create a 10-step ramp from a base color with equal lightness distance
 * on either side of the base color.
 */
export function generateDecileRampFromBaseColor(baseHex: string): string[] {
  const rgb = hexToRgb(baseHex);
  if (!rgb) return Array(10).fill('#cccccc');

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const steps = 10;
  const spread = 0.34;
  const half = (steps - 1) / 2;

  return Array.from({ length: steps }, (_, i) => {
    const normalized = (i - half) / half;
    const li = clamp(l + normalized * spread, 0.08, 0.92);
    const { r, g, b } = hslToRgb(h, s, li);
    return rgbToHex(r, g, b);
  });
}

// ── Full default style ────────────────────────────────────────────────────────

export const DEFAULT_STYLE: Required<MapStyleOptions> = {
  choropleth: {
    decileColorsByNation: {},
    baseColorByNation: {
      england: DEFAULT_BASE_COLORS_BY_NATION.england,
      wales: DEFAULT_BASE_COLORS_BY_NATION.wales,
      scotland: DEFAULT_BASE_COLORS_BY_NATION.scotland,
      northern_ireland: DEFAULT_BASE_COLORS_BY_NATION.northern_ireland,
    },
    fallbackDecileColors: generateDecileRampFromBaseColor(DEFAULT_BASE_COLORS_BY_NATION.england),
    fillOpacity: 0.7,
    borderColor: '#ffffff',
    borderWidth: 0.5,
    hoverBorderColor: RCPCH_DARK_BLUE,
    hoverBorderWidth: 2,
  },
  boundaries: {
    localAuthorityColor: RCPCH_DARK_BLUE,
    localAuthorityWidth: 1,
    nhserColor: RCPCH_PINK,
    nhserWidth: 1.5,
    icbColor: RCPCH_CHARCOAL,
    icbWidth: 1,
    lhbColor: RCPCH_LIGHT_BLUE,
    lhbWidth: 1,
  },
  patients: {
    circleColor: RCPCH_DARK_BLUE,
    circleRadius: 5,
    circleStrokeColor: '#ffffff',
    circleStrokeWidth: 1,
    circleOpacity: 0.8,
    colorByGroup: {},
  },
  leadCentre: {
    color: RCPCH_PINK,
    radius: 10,
    strokeColor: '#ffffff',
    strokeWidth: 2,
  },
  tooltip: {
    backgroundColor: RCPCH_DARK_BLUE,
    textColor: '#ffffff',
    borderColor: RCPCH_DARK_BLUE,
    borderRadius: 4,
    areaLabel: 'Area',
    decileLabel: 'IMD decile',
    nationLabel: 'Nation',
    patientLabel: 'Patient',
    leadCentreLabel: 'Lead centre',
    areaTooltipText:
      '<strong style="display:block;margin-bottom:2px;">{{areaName}}</strong>' +
      '<span>LSOA year: {{boundaryYear}}</span><br/>' +
      '<span>{{decileLabel}}: <strong>{{imdDecile}}</strong></span><br/>' +
      '<span>IMD year: {{imdYear}}</span><br/>' +
      '<span>{{nationLabel}}: {{nation}}</span>',
    patientTooltipText: '{{patientLabel}}',
    leadCentreTooltipText: '{{leadCentreLabel}}: {{label}}',
  },
  legend: {
    backgroundColor: '#ffffff',
    textColor: RCPCH_DARK_BLUE,
    borderColor: '#d8dde6',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    width: 220,
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
    toggleOnColor: RCPCH_DARK_BLUE,
    toggleOffColor: '#6b7280',
  },
};

// ── Style helpers ─────────────────────────────────────────────────────────────

/** Deep-merge consumer overrides on top of the library defaults. */
export function mergeStyle(
  defaults: Required<MapStyleOptions>,
  overrides?: MapStyleOptions,
): Required<MapStyleOptions> {
  if (!overrides) return defaults;
  return {
    choropleth: { ...defaults.choropleth, ...overrides.choropleth },
    boundaries: { ...defaults.boundaries, ...overrides.boundaries },
    patients: { ...defaults.patients, ...overrides.patients },
    leadCentre: { ...defaults.leadCentre, ...overrides.leadCentre },
    tooltip: { ...defaults.tooltip, ...overrides.tooltip },
    legend: { ...defaults.legend, ...overrides.legend },
  };
}

/**
 * Pick the 10-color decile array for a given nation from the resolved style.
 * Falls back to `fallbackDecileColors` → England defaults.
 */
export function getDecileColors(
  nation: Nation | string,
  style: Required<MapStyleOptions>,
): string[] {
  const byNation = style.choropleth.decileColorsByNation ?? {};
  const fromExplicitRamp = byNation[nation as Nation];
  if (fromExplicitRamp && fromExplicitRamp.length === 10) return fromExplicitRamp;

  const baseByNation = style.choropleth.baseColorByNation ?? {};
  const configuredBase = baseByNation[nation as Nation];
  if (configuredBase) return generateDecileRampFromBaseColor(configuredBase);

  const defaultBase =
    DEFAULT_BASE_COLORS_BY_NATION[nation as Nation] ?? DEFAULT_BASE_COLORS_BY_NATION.england;

  return (
    generateDecileRampFromBaseColor(defaultBase) ??
    style.choropleth.fallbackDecileColors ??
    generateDecileRampFromBaseColor(DEFAULT_BASE_COLORS_BY_NATION.england)
  );
}
