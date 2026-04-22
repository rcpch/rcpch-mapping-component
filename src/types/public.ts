import type { Feature, FeatureCollection, Point } from 'geojson';

// ── Basic domain types ────────────────────────────────────────────────────────

export type Nation = 'all' | 'england' | 'wales' | 'scotland' | 'northern_ireland';
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

export interface MapStyleOptions {
  choropleth?: ChoroplethStyleOptions;
  boundaries?: BoundaryStyleOptions;
  patients?: PatientStyleOptions;
  leadCentre?: LeadCentreStyleOptions;
  tooltip?: TooltipStyleOptions;
}

// ── Map state ─────────────────────────────────────────────────────────────────

export interface ImdMapState {
  nation: Nation;
  era: Era;
  /** The era actually used for tile fetching — may differ from requested era. */
  effectiveEra: Era;
  hasPatients: boolean;
  hasLeadCentre: boolean;
  overlays: {
    localAuthority: boolean;
    nhser: boolean;
    icb: boolean;
    lhb: boolean;
  };
}

// ── Event payloads ────────────────────────────────────────────────────────────

export interface AreaHoverPayload {
  lsoaCode: string | undefined;
  lsoaName: string | undefined;
  imdDecile: number | undefined;
  nation: string | undefined;
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

// ── Lead centre overlay ───────────────────────────────────────────────────────

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

// ── Main options and instance ─────────────────────────────────────────────────

export interface CreateImdMapOptions {
  /** DOM element ID string or an HTMLElement reference. */
  container: string | HTMLElement;
  /** Base URL of the tile server. Required for choropleth rendering. */
  tilesBaseUrl?: string;
  initialNation?: Nation;
  initialEra?: Era;
  showDefaultControls?: boolean;
  enableLocalAuthorityOverlay?: boolean;
  enableHealthOverlays?: boolean;
  /** MapLibre GL style URL. Defaults to Carto Positron. */
  mapStyleUrl?: string;
  /** Initial map center as [longitude, latitude]. */
  center?: [number, number];
  zoom?: number;
  style?: MapStyleOptions;
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
  getState(): ImdMapState;
  resize(): void;
  /** Fit map to plotted patients and/or lead centre. Uses bounds + optional padding. */
  fitToData(options?: { zoom?: number; padding?: number }): void;
  destroy(): void;
}
