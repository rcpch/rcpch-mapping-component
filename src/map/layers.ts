import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Nation, Era, MapStyleOptions, LeadCentresStyleOptions } from '../types/public';
import { choroplethSourceId, PATIENTS_SOURCE_ID, LEAD_CENTRE_SOURCE_ID, LEAD_CENTRES_SOURCE_ID } from './sources';
import { getDecileColors } from './styles';
import { ZOOM_TIERS, resolveFullTableName, resolveNationFilter } from '../core/resolver';
import type { ZoomTier } from '../core/resolver';

// ── Layer ID helpers ──────────────────────────────────────────────────────────

export function choroplethFillLayerId(tier: ZoomTier): string {
  return `rcpch-imd-fill-${tier}`;
}

export function choroplethLineLayerId(tier: ZoomTier): string {
  return `rcpch-imd-line-${tier}`;
}

export const ALL_CHOROPLETH_LAYER_IDS = ZOOM_TIERS.flatMap((t) => [
  choroplethFillLayerId(t.tier),
  choroplethLineLayerId(t.tier),
]);

export const PATIENTS_LAYER_ID = 'rcpch-imd-patients';
export const LEAD_CENTRE_LAYER_ID = 'rcpch-imd-lead-centre';
export const LEAD_CENTRES_LAYER_ID = 'rcpch-imd-lead-centres';

// Expose a representative fill layer ID for hover/click event binding.
// We attach mouse events to the high-zoom tier layer as it is most precise
// at the zoom levels where users will actually interact with individual areas.
export const CHOROPLETH_FILL_LAYER_ID = choroplethFillLayerId('z8_10');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a MapLibre step expression mapping imd_decile (1–10) to colors.
 */
function buildDecileColorExpression(colors: string[]): unknown[] {
  const fallback = colors[0] ?? '#cccccc';
  return [
    'step',
    ['get', 'imd_decile'],
    fallback,
    2, colors[1] ?? fallback,
    3, colors[2] ?? fallback,
    4, colors[3] ?? fallback,
    5, colors[4] ?? fallback,
    6, colors[5] ?? fallback,
    7, colors[6] ?? fallback,
    8, colors[7] ?? fallback,
    9, colors[8] ?? fallback,
    10, colors[9] ?? fallback,
  ];
}

/**
 * Build a MapLibre fill-color expression for a given nation view.
 * - Single nation: a `step` expression on imd_decile.
 * - All nations ('all'): a `match` expression on the `nation` feature property,
 *   each branch using its own decile color ramp, so England/Wales/Scotland/NI
 *   each render in their own color family simultaneously.
 */
function buildColorExpression(nation: Nation, style: Required<MapStyleOptions>): unknown[] {
  if (nation !== 'all') {
    return buildDecileColorExpression(getDecileColors(nation, style));
  }

  const perNation = (
    ['england', 'wales', 'scotland', 'northern_ireland', 'channel_islands'] as const
  ).flatMap((n) => [n, buildDecileColorExpression(getDecileColors(n, style))]);

  return [
    'match',
    ['get', 'nation'],
    ...perNation,
    // fallback for any unrecognised nation value
    getDecileColors('england', style)[0] ?? '#cccccc',
  ];
}

/**
 * Find the first symbol layer so choropleth fills are inserted below labels.
 */
function firstSymbolLayerId(map: MaplibreMap): string | undefined {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}

export function buildPatientCircleColorExpression(
  style: Required<MapStyleOptions>,
): string | unknown[] {
  const fallback = style.patients.circleColor ?? '#0d0d58';
  const groupMap = style.patients.colorByGroup ?? {};
  const entries = Object.entries(groupMap).filter(([k, v]) => k && v);

  if (!entries.length) return fallback;

  return [
    'match',
    ['coalesce', ['to-string', ['get', 'group']], ''],
    ...entries.flatMap(([group, color]) => [group, color]),
    fallback,
  ];
}

// ── Choropleth layers (3 per view) ────────────────────────────────────────────
//
// One fill + one line layer per zoom tier. Each pair is constrained to its
// zoom range. MapLibre renders only the active tier at any given zoom level.

export function addChoroplethLayers(
  map: MaplibreMap,
  nation: Nation,
  effectiveEra: Era,
  style: Required<MapStyleOptions>,
): void {
  removeChoroplethLayers(map);

  const nationFilter = resolveNationFilter(nation);
  const filterProps = nationFilter ? ({ filter: nationFilter as any }) : {};
  const before = firstSymbolLayerId(map);

  for (const { tier, minzoom, maxzoom } of ZOOM_TIERS) {
    const sourceId = choroplethSourceId(tier);
    const sourceLayer = resolveFullTableName(effectiveEra, tier);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colorExpr = buildColorExpression(nation, style) as any;

    map.addLayer(
      {
        id: choroplethFillLayerId(tier),
        type: 'fill',
        source: sourceId,
        'source-layer': sourceLayer,
        minzoom,
        maxzoom,
        ...filterProps,
        paint: {
          'fill-color': colorExpr,
          'fill-opacity': style.choropleth.fillOpacity ?? 0.7,
        },
      },
      before,
    );

    map.addLayer(
      {
        id: choroplethLineLayerId(tier),
        type: 'line',
        source: sourceId,
        'source-layer': sourceLayer,
        minzoom,
        maxzoom,
        ...filterProps,
        paint: {
          'line-color': style.choropleth.borderColor ?? '#ffffff',
          'line-width': style.choropleth.borderWidth ?? 0.5,
        },
      },
      before,
    );
  }
}

export function removeChoroplethLayers(map: MaplibreMap): void {
  for (const id of ALL_CHOROPLETH_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
}

export function updateChoroplethStyle(
  map: MaplibreMap,
  nation: Nation,
  style: Required<MapStyleOptions>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorExpr = buildColorExpression(nation, style) as any;

  for (const { tier } of ZOOM_TIERS) {
    const fillId = choroplethFillLayerId(tier);
    const lineId = choroplethLineLayerId(tier);
    if (!map.getLayer(fillId)) continue;
    map.setPaintProperty(fillId, 'fill-color', colorExpr);
    map.setPaintProperty(fillId, 'fill-opacity', style.choropleth.fillOpacity ?? 0.7);
    map.setPaintProperty(lineId, 'line-color', style.choropleth.borderColor ?? '#ffffff');
    map.setPaintProperty(lineId, 'line-width', style.choropleth.borderWidth ?? 0.5);
  }
}

export function updateChoroplethNationFilter(
  map: MaplibreMap,
  nation: Nation,
  effectiveEra: Era,
): void {
  const nationFilter = resolveNationFilter(nation);

  for (const { tier } of ZOOM_TIERS) {
    const fillId = choroplethFillLayerId(tier);
    const lineId = choroplethLineLayerId(tier);
    if (!map.getLayer(fillId)) continue;

    // Update source-layer in case era changed (era change requires layer rebuild)
    // For nation-only changes on same era, just update the filter.
    const newSourceLayer = resolveFullTableName(effectiveEra, tier);
    // MapLibre does not expose setSourceLayer, so if source-layer needs to change
    // the caller must rebuild the layers. Just update filter here.
    void newSourceLayer; // acknowledged — era change is handled by removeChoroplethLayers + addChoroplethLayers

    map.setFilter(fillId, nationFilter as any);
    map.setFilter(lineId, nationFilter as any);
  }
}

// ── Patient layer ─────────────────────────────────────────────────────────────

export function addOrUpdatePatientsLayer(
  map: MaplibreMap,
  style: Required<MapStyleOptions>,
): void {
  const p = style.patients;
  const color = buildPatientCircleColorExpression(style);

  if (map.getLayer(PATIENTS_LAYER_ID)) {
    map.setPaintProperty(PATIENTS_LAYER_ID, 'circle-color', color as any);
    map.setPaintProperty(PATIENTS_LAYER_ID, 'circle-radius', p.circleRadius ?? 5);
    map.setPaintProperty(PATIENTS_LAYER_ID, 'circle-stroke-color', p.circleStrokeColor ?? '#ffffff');
    map.setPaintProperty(PATIENTS_LAYER_ID, 'circle-stroke-width', p.circleStrokeWidth ?? 1);
    map.setPaintProperty(PATIENTS_LAYER_ID, 'circle-opacity', p.circleOpacity ?? 0.8);
  } else {
    map.addLayer({
      id: PATIENTS_LAYER_ID,
      type: 'circle',
      source: PATIENTS_SOURCE_ID,
      paint: {
        'circle-color': color as any,
        'circle-radius': p.circleRadius ?? 5,
        'circle-stroke-color': p.circleStrokeColor ?? '#ffffff',
        'circle-stroke-width': p.circleStrokeWidth ?? 1,
        'circle-opacity': p.circleOpacity ?? 0.8,
      },
    });
  }
}

export function removePatientsLayer(map: MaplibreMap): void {
  if (map.getLayer(PATIENTS_LAYER_ID)) map.removeLayer(PATIENTS_LAYER_ID);
}

// ── Lead-centre layer ─────────────────────────────────────────────────────────

export function addOrUpdateLeadCentreLayer(
  map: MaplibreMap,
  style: Required<MapStyleOptions>,
): void {
  const lc = style.leadCentre;

  if (map.getLayer(LEAD_CENTRE_LAYER_ID)) {
    map.setPaintProperty(LEAD_CENTRE_LAYER_ID, 'circle-color', lc.color ?? '#e00087');
    map.setPaintProperty(LEAD_CENTRE_LAYER_ID, 'circle-radius', lc.radius ?? 10);
    map.setPaintProperty(LEAD_CENTRE_LAYER_ID, 'circle-stroke-color', lc.strokeColor ?? '#ffffff');
    map.setPaintProperty(LEAD_CENTRE_LAYER_ID, 'circle-stroke-width', lc.strokeWidth ?? 2);
  } else {
    map.addLayer({
      id: LEAD_CENTRE_LAYER_ID,
      type: 'circle',
      source: LEAD_CENTRE_SOURCE_ID,
      paint: {
        'circle-color': lc.color ?? '#e00087',
        'circle-radius': lc.radius ?? 10,
        'circle-stroke-color': lc.strokeColor ?? '#ffffff',
        'circle-stroke-width': lc.strokeWidth ?? 2,
      },
    });
  }
}

export function removeLeadCentreLayer(map: MaplibreMap): void {
  if (map.getLayer(LEAD_CENTRE_LAYER_ID)) map.removeLayer(LEAD_CENTRE_LAYER_ID);
}

// ── Lead-centres (plural) bubble layer ───────────────────────────────────────

interface BubbleContext {
  sizeMin: number;
  sizeMax: number;
  colorMin: number;
  colorMax: number;
}

/**
 * Build a MapLibre circle-radius expression that linearly interpolates the sizeField
 * between [sizeMin → minRadius] and [sizeMax → maxRadius].
 * Falls back to defaultRadius when the field value is absent.
 */
export function buildBubbleSizeExpression(
  lc: Required<LeadCentresStyleOptions>,
  ctx: Pick<BubbleContext, 'sizeMin' | 'sizeMax'>,
): unknown {
  const { sizeField, minRadius, maxRadius, defaultRadius } = lc;
  const { sizeMin, sizeMax } = ctx;

  if (sizeMin >= sizeMax) return defaultRadius;

  return [
    'interpolate', ['linear'],
    ['coalesce', ['to-number', ['get', sizeField], null], -1],
    -1, defaultRadius,
    sizeMin, minRadius,
    sizeMax, maxRadius,
  ];
}

/**
 * Build a MapLibre circle-color expression.
 * Continuous mode: interpolates numeric colorField linearly across colorScale stops.
 * Categorical mode: maps string colorField values via colorByCategory.
 */
export function buildBubbleColorExpression(
  lc: Required<LeadCentresStyleOptions>,
  ctx: Pick<BubbleContext, 'colorMin' | 'colorMax'>,
): unknown {
  const { colorMode, colorField, colorFallback } = lc;

  if (colorMode === 'categorical') {
    const entries = Object.entries(lc.colorByCategory ?? {}).filter(([k, v]) => k && v);
    if (!entries.length) return colorFallback;
    return [
      'match',
      ['coalesce', ['to-string', ['get', colorField]], ''],
      ...entries.flatMap(([cat, col]) => [cat, col]),
      colorFallback,
    ];
  }

  // Continuous mode
  const { colorMin, colorMax } = ctx;
  const stops = lc.colorScale ?? ['#2166ac', '#f7f7f7', '#d6604d'];

  if (colorMin >= colorMax || stops.length < 2) return stops[0] ?? colorFallback;

  const range = colorMax - colorMin;
  const interpolateArgs: unknown[] = [];
  stops.forEach((color, i) => {
    interpolateArgs.push(colorMin + (i / (stops.length - 1)) * range, color);
  });

  return [
    'interpolate', ['linear'],
    ['coalesce', ['to-number', ['get', colorField], null], colorMin],
    ...interpolateArgs,
  ];
}

export function addOrUpdateLeadCentresLayer(
  map: MaplibreMap,
  style: Required<MapStyleOptions>,
  ctx: BubbleContext,
): void {
  const lc = style.leadCentres as Required<LeadCentresStyleOptions>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const radius = buildBubbleSizeExpression(lc, ctx) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const color = buildBubbleColorExpression(lc, ctx) as any;

  if (map.getLayer(LEAD_CENTRES_LAYER_ID)) {
    map.setPaintProperty(LEAD_CENTRES_LAYER_ID, 'circle-radius', radius);
    map.setPaintProperty(LEAD_CENTRES_LAYER_ID, 'circle-color', color);
    map.setPaintProperty(LEAD_CENTRES_LAYER_ID, 'circle-stroke-color', lc.strokeColor ?? '#ffffff');
    map.setPaintProperty(LEAD_CENTRES_LAYER_ID, 'circle-stroke-width', lc.strokeWidth ?? 2);
    map.setPaintProperty(LEAD_CENTRES_LAYER_ID, 'circle-opacity', lc.opacity ?? 0.85);
  } else {
    map.addLayer({
      id: LEAD_CENTRES_LAYER_ID,
      type: 'circle',
      source: LEAD_CENTRES_SOURCE_ID,
      paint: {
        'circle-radius': radius,
        'circle-color': color,
        'circle-stroke-color': lc.strokeColor ?? '#ffffff',
        'circle-stroke-width': lc.strokeWidth ?? 2,
        'circle-opacity': lc.opacity ?? 0.85,
      },
    });
  }
}

export function removeLeadCentresLayer(map: MaplibreMap): void {
  if (map.getLayer(LEAD_CENTRES_LAYER_ID)) map.removeLayer(LEAD_CENTRES_LAYER_ID);
}
