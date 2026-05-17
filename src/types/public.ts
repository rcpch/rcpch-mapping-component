import type { Feature, FeatureCollection, Point } from 'geojson';

// ── Basic domain types ────────────────────────────────────────────────────────

export type Nation = 'all' | 'england' | 'wales' | 'scotland' | 'northern_ireland' | 'channel_islands';
export type Era = '2011' | '2021';

// ── Style options ─────────────────────────────────────────────────────────────

export interface ChoroplethStyleOptions {
  /** Per-nation arrays of 10 hex colors, index 0 = decile 1 (most deprived). */
  decileColorsByNation?: Partial<Record<Nation, string[]>>;
  /**
   * Per-nation base colors used to auto-generate a 10-step decile ramp.
   * If both this and decileColorsByNation are supplied, decileColorsByNation wins.
   */
  baseColorByNation?: Partial<Record<Nation, string>>;
  /** Fallback color array used when no nation-specific ramp is provided. */
  fallbackDecileColors?: string[];
  fillOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  hoverBorderColor?: string;
  hoverBorderWidth?: number;
}

export interface BoundaryStyleOptions {
  localAuthorityColor?: string;
  localAuthorityWidth?: number;
  nhserColor?: string;
  nhserWidth?: number;
  icbColor?: string;
  icbWidth?: number;
  lhbColor?: string;
  lhbWidth?: number;
}

export interface PatientStyleOptions {
  circleColor?: string;
  circleRadius?: number;
  circleStrokeColor?: string;
  circleStrokeWidth?: number;
  circleOpacity?: number;
  /** Map of group string → color hex for per-group coloring. */
  colorByGroup?: Record<string, string>;
}

export interface LeadCentreStyleOptions {
  color?: string;
  radius?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

// ── Lead centres (plural) bubble map ─────────────────────────────────────────

export interface LeadCentresBreakdownField {
  /** Property name on the feature carrying a numeric value (proportion, count, etc.). */
  field: string;
  /** Human-readable label shown in the tooltip breakdown bar. */
  label: string;
  /** Hex color for the bar fill. */
  color: string;
}

export interface LeadCentresStyleOptions {
  /** Property name driving bubble radius. Default: 'size'. */
  sizeField?: string;
  /** Human-readable label for the size dimension (legend + tooltip). Default: 'Count'. */
  sizeLabel?: string;
  /** Minimum rendered radius in pixels. Default: 8. */
  minRadius?: number;
  /** Maximum rendered radius in pixels. Default: 40. */
  maxRadius?: number;
  /** Radius used when sizeField value is absent or invalid. Default: 12. */
  defaultRadius?: number;

  /** Property name driving bubble colour. Default: 'color_value'. */
  colorField?: string;
  /** Human-readable label for the colour dimension (legend + tooltip). Default: 'Value'. */
  colorLabel?: string;

  /**
   * 'continuous' (default): colorField is numeric; colour interpolates linearly across
   *   the auto-computed [min, max] range via colorScale.
   * 'categorical': colorField is a string; each distinct value maps to a fixed colour
   *   via colorByCategory. Encodes a per-centre classification (e.g. centre type,
   *   dominant diabetes type). Not suitable for patient population breakdowns.
   */
  colorMode?: 'continuous' | 'categorical';

  /** Continuous mode: unit string appended after colour values in the tooltip. Default: ''. */
  colorUnit?: string;
  /** Continuous mode: hex colour stops applied linearly across [min, max]. Default: blue→white→red. */
  colorScale?: string[];

  /** Categorical mode: map of category string value → hex colour. */
  colorByCategory?: Record<string, string>;
  /**
   * Categorical mode: fields to render as proportional breakdown bars in the tooltip.
   * Values should be pre-computed server-side (proportions, percentages, or counts).
   */
  breakdownFields?: LeadCentresBreakdownField[];

  /** Fallback colour for missing or invalid colorField values. Default: '#aaaaaa'. */
  colorFallback?: string;

  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface TooltipStyleOptions {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  /** Label for the area name row. Default: "Area". */
  areaLabel?: string;
  /** Label for the IMD decile row. Default: "IMD decile". */
  decileLabel?: string;
  /** Label for the nation row. Default: "Nation". */
  nationLabel?: string;
  /** Label used in patient hover tooltips. Default: "Patient". */
  patientLabel?: string;
  /** Label used in lead-centre hover tooltip. Default: "Lead centre". */
  leadCentreLabel?: string;
  /**
   * Area tooltip content template.
   * Supports token interpolation, e.g. "{{areaName}}", "{{imdDecile}}", "{{nation}}".
   */
  areaTooltipText?: string;
  /**
   * Patient tooltip content template.
   * Supports token interpolation, e.g. "{{patientLabel}}" or "{{id}}".
   */
  patientTooltipText?: string;
  /**
   * Lead-centre tooltip content template.
   * Supports token interpolation, e.g. "{{leadCentreLabel}}: {{label}}".
   */
  leadCentreTooltipText?: string;
}

export type LegendPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface LegendStyleOptions {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  width?: number;
  boxShadow?: string;
  toggleOnColor?: string;
  toggleOffColor?: string;
}

export interface MapStyleOptions {
  choropleth?: ChoroplethStyleOptions;
  boundaries?: BoundaryStyleOptions;
  patients?: PatientStyleOptions;
  leadCentre?: LeadCentreStyleOptions;
  leadCentres?: LeadCentresStyleOptions;
  tooltip?: TooltipStyleOptions;
  legend?: LegendStyleOptions;
}

// ── Map state ─────────────────────────────────────────────────────────────────

export interface ImdMapState {
  nation: Nation;
  era: Era;
  /** The era actually used for tile fetching — may differ from requested era. */
  effectiveEra: Era;
  hasPatients: boolean;
  hasLeadCentre: boolean;
  hasLeadCentres: boolean;
  overlays: {
    localAuthority: boolean;
    nhser: boolean;
    icb: boolean;
    lhb: boolean;
  };
}

// ── Event payloads ────────────────────────────────────────────────────────────

export interface AreaHoverPayload {
  areaCode: string | undefined;
  areaName: string | undefined;
  areaType: string | undefined;
  nation: string | undefined;
  imdDecile: number | undefined;
  imdYear: number | undefined;
  boundaryYear: number | undefined;
  laCode: string | undefined;
  laName: string | undefined;
  laYear: number | undefined;
  nhserCode: string | undefined;
  nhserName: string | undefined;
  icbCode: string | undefined;
  icbName: string | undefined;
  lhbCode: string | undefined;
  lhbName: string | undefined;
  lngLat: { lng: number; lat: number };
  // Backward-compatible aliases retained for existing consumers.
  lsoaCode: string | undefined;
  lsoaName: string | undefined;
  rawProperties: Record<string, unknown>;
}

export type AreaClickPayload = AreaHoverPayload;

// ── Patient overlay ───────────────────────────────────────────────────────────

export interface NormalizedPatientPoint {
  id?: string;
  lon: number;
  lat: number;
  weight?: number;
  group?: string;
  properties?: Record<string, unknown>;
}

/** A plain record coming from a Django view or similar server-rendered source. */
export interface PatientRecord {
  id?: string | number;
  lat?: number;
  latitude?: number;
  lon?: number;
  lng?: number;
  longitude?: number;
  weight?: number;
  group?: string;
  [key: string]: unknown;
}

export type PatientInput =
  | FeatureCollection<Point>
  | PatientRecord[]
  | Feature<Point>[];

export interface PatientLayerOptions {
  /** When true, throws on the first invalid record instead of emitting a warning. */
  strict?: boolean;
}

// ── Lead centre overlay (singular) ───────────────────────────────────────────

export interface LeadCentreInput {
  lat?: number;
  latitude?: number;
  lon?: number;
  lng?: number;
  longitude?: number;
  label?: string;
  /** GeoJSON point feature is also accepted. */
  type?: string;
  geometry?: { type: 'Point'; coordinates: [number, number] };
  properties?: Record<string, unknown>;
}

export interface LeadCentreOptions {
  label?: string;
}

// ── Lead centres overlay (plural — bubble map) ────────────────────────────────

/**
 * A single entry in the array passed to `setLeadCentres()`.
 * lat/lon aliases follow the same flexible convention as LeadCentreInput.
 * Any additional fields are passed through to the GeoJSON feature properties
 * and are available for size/colour/breakdown rendering and tooltip templates.
 */
export interface LeadCentreBubbleInput {
  lat?: number;
  latitude?: number;
  lon?: number;
  lng?: number;
  longitude?: number;
  label?: string;
  [key: string]: unknown;
}

export interface LeadCentresOptions {
  /** When true, throws on the first invalid record instead of emitting a warning. */
  strict?: boolean;
}

// ── Main options and instance ─────────────────────────────────────────────────

export interface CreateImdMapOptions {
  /** DOM element ID string or an HTMLElement reference. */
  container: string | HTMLElement;
  /** Base URL of the tile server. Required for choropleth rendering. */
  tilesBaseUrl?: string;
  /** Optional API key appended to tile URLs as a query string parameter. */
  tilesApiKey?: string;
  /** Query parameter name used for tilesApiKey. Default: api_key. */
  tilesApiKeyParam?: string;
  initialNation?: Nation;
  initialEra?: Era;
  showDefaultControls?: boolean;
  enableLocalAuthorityOverlay?: boolean;
  enableHealthOverlays?: boolean;
  showLegend?: boolean;
  legendPosition?: LegendPosition;
  legendCollapsed?: boolean;
  showLegendLocalAuthority?: boolean;
  showLegendNhser?: boolean;
  showLegendIcb?: boolean;
  showLegendLhb?: boolean;
  legendTitle?: string;
  /** MapLibre GL style URL. Defaults to Carto Positron. */
  mapStyleUrl?: string;
  /** Initial map center as [longitude, latitude]. */
  center?: [number, number];
  zoom?: number;
  style?: MapStyleOptions;
  /**
   * Area tooltip rendering mode.
   * - default: built-in tooltip content
   * - template: uses style.tooltip.areaTooltipText token interpolation
   * - none: disables built-in area popup (callbacks still fire)
   */
  areaTooltipMode?: 'default' | 'template' | 'none';
  onViewChange?: (view: { nation: Nation; era: Era; effectiveEra: Era }) => void;
  onAreaHover?: (payload: AreaHoverPayload) => void;
  onAreaClick?: (payload: AreaClickPayload) => void;
  onWarning?: (warning: { code: string; message: string; details?: unknown }) => void;
}

export interface ImdMapInstance {
  setView(input: { nation?: Nation; era?: Era }): void;
  setNation(nation: Nation): void;
  setEra(era: Era): void;
  setStyle(style: MapStyleOptions): void;
  setOverlayVisibility(input: {
    localAuthority?: boolean;
    nhser?: boolean;
    icb?: boolean;
    lhb?: boolean;
  }): void;
  setPatients(data: PatientInput, options?: PatientLayerOptions): void;
  clearPatients(): void;
  setLeadCentre(data: LeadCentreInput, options?: LeadCentreOptions): void;
  clearLeadCentre(): void;
  /** Render multiple lead centres as a proportional symbol (bubble) map. */
  setLeadCentres(data: LeadCentreBubbleInput[], options?: LeadCentresOptions): void;
  clearLeadCentres(): void;
  getState(): ImdMapState;
  resize(): void;
  /** Fit map to plotted patients and/or lead centre. Uses bounds + optional padding. */
  fitToData(options?: { zoom?: number; padding?: number }): void;
  destroy(): void;
}
