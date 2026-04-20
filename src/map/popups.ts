import { Popup } from 'maplibre-gl';
import type { Map as MaplibreMap, MapMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import type { CreateImdMapOptions, MapStyleOptions, AreaHoverPayload } from '../types/public';
import {
  CHOROPLETH_FILL_LAYER_ID,
  ALL_CHOROPLETH_LAYER_IDS,
  PATIENTS_LAYER_ID,
  LEAD_CENTRE_LAYER_ID,
} from './layers';
import { getFeatureProperty } from '../utils/properties';

function interpolateTemplate(template: string, tokens: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const value = tokens[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

// ── Tooltip HTML builder ──────────────────────────────────────────────────────
// Property names match the pg_tileserv uk_master_* schema:
//   code, area_name, imd_decile, nation

export function buildChoroplethTooltipHtml(
  properties: Record<string, unknown> | null | undefined,
  style: Required<MapStyleOptions>,
): string {
  const t = style.tooltip;
  const areaName = getFeatureProperty(properties, 'area_name') ?? 'Unknown area';
  const decile = getFeatureProperty(properties, 'imd_decile') ?? '–';
  const nation = getFeatureProperty(properties, 'nation') ?? '–';
  const areaYear = getFeatureProperty(properties, 'year') ?? '–';
  const imdYear = getFeatureProperty(properties, 'imd_year') ?? '–';

  const bg = t.backgroundColor ?? '#0d0d58';
  const color = t.textColor ?? '#ffffff';
  const radius = t.borderRadius ?? 4;

  return `<div style="background:${bg};color:${color};padding:8px 12px;border-radius:${radius}px;font-size:13px;line-height:1.6;font-family:sans-serif;">
  <strong style="display:block;margin-bottom:2px;">${String(areaName)}</strong>
  <span>LSOA year: ${String(areaYear)}</span><br/>
  <span>${t.decileLabel ?? 'IMD decile'}: <strong>${String(decile)}</strong></span><br/>
  <span>IMD year: ${String(imdYear)}</span><br/>
  <span>${t.nationLabel ?? 'Nation'}: ${String(nation)}</span>
</div>`;
}

export function buildPatientTooltipHtml(
  properties: Record<string, unknown> | null | undefined,
  style: Required<MapStyleOptions>,
): string {
  const t = style.tooltip;
  const id = getFeatureProperty(properties, 'id') ?? '';
  const group = getFeatureProperty(properties, 'group') ?? '';

  const bg = t.backgroundColor ?? '#0d0d58';
  const color = t.textColor ?? '#ffffff';
  const radius = t.borderRadius ?? 4;

  const patientLabel = t.patientLabel ?? 'Patient';
  const template = t.patientTooltipText ?? '{{patientLabel}}';
  const tokens = {
    // Spread all feature properties first so named tokens (id, group, etc.)
    // override any same-named extra field, and extra fields like nhs_number
    // are available as {{nhs_number}} etc.
    ...(properties ?? {}),
    patientLabel,
    id,
    group,
  };

  const text = interpolateTemplate(template, tokens);

  return `<div style="background:${bg};color:${color};padding:8px 12px;border-radius:${radius}px;font-size:13px;line-height:1.6;font-family:sans-serif;">
  <span>${text}</span>
</div>`;
}

export function buildLeadCentreTooltipHtml(
  properties: Record<string, unknown> | null | undefined,
  style: Required<MapStyleOptions>,
): string {
  const t = style.tooltip;
  const label = getFeatureProperty(properties, 'label') ?? 'Lead centre';

  const bg = t.backgroundColor ?? '#0d0d58';
  const color = t.textColor ?? '#ffffff';
  const radius = t.borderRadius ?? 4;

  const leadCentreLabel = t.leadCentreLabel ?? 'Lead centre';
  const text = interpolateTemplate(t.leadCentreTooltipText ?? '{{leadCentreLabel}}: {{label}}', {
    leadCentreLabel,
    label,
  });

  return `<div style="background:${bg};color:${color};padding:8px 12px;border-radius:${radius}px;font-size:13px;line-height:1.6;font-family:sans-serif;">
  <span>${text}</span>
</div>`;
}

function featureToPayload(
  feature: MapGeoJSONFeature,
): AreaHoverPayload {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const decileRaw = getFeatureProperty(props, 'imd_decile');
  return {
    lsoaCode: String(getFeatureProperty(props, 'code') ?? ''),
    lsoaName: String(getFeatureProperty(props, 'area_name') ?? ''),
    imdDecile: typeof decileRaw === 'number' ? decileRaw : undefined,
    nation: String(getFeatureProperty(props, 'nation') ?? ''),
    rawProperties: props,
  };
}

// ── Attach hover + click handlers ────────────────────────────────────────────
// Events are attached to all fill layer IDs (all zoom tiers) so hover works
// at every zoom level.

export function attachChoroplethInteraction(
  map: MaplibreMap,
  popup: Popup,
  style: Required<MapStyleOptions>,
  options: Pick<CreateImdMapOptions, 'onAreaHover' | 'onAreaClick'>,
): void {
  // All fill layer IDs from all zoom tiers
  const fillLayers = ALL_CHOROPLETH_LAYER_IDS.filter((id) => id.startsWith('rcpch-imd-fill-'));

  for (const layerId of fillLayers) {
    map.on('mousemove', layerId, (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (!features.length) return;

      map.getCanvas().style.cursor = 'pointer';

      const feature = features[0];
      popup
        .setLngLat(e.lngLat)
        .setHTML(buildChoroplethTooltipHtml(feature.properties as Record<string, unknown>, style))
        .addTo(map);

      options.onAreaHover?.(featureToPayload(feature));
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('click', layerId, (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (!features.length) return;
      options.onAreaClick?.(featureToPayload(features[0]));
    });
  }

  // Keep the named export for any caller that references a single fill layer
  void CHOROPLETH_FILL_LAYER_ID;
}

export function attachPatientInteraction(
  map: MaplibreMap,
  popup: Popup,
  style: Required<MapStyleOptions>,
): void {
  map.on('mousemove', PATIENTS_LAYER_ID, (e: MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [PATIENTS_LAYER_ID] });
    if (!features.length) return;

    const feature = features[0];
    map.getCanvas().style.cursor = 'pointer';
    popup
      .setLngLat(e.lngLat)
      .setHTML(buildPatientTooltipHtml(feature.properties as Record<string, unknown>, style))
      .addTo(map);
  });

  map.on('mouseleave', PATIENTS_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

export function attachLeadCentreInteraction(
  map: MaplibreMap,
  popup: Popup,
  style: Required<MapStyleOptions>,
): void {
  map.on('mousemove', LEAD_CENTRE_LAYER_ID, (e: MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [LEAD_CENTRE_LAYER_ID] });
    if (!features.length) return;

    const feature = features[0];
    map.getCanvas().style.cursor = 'pointer';
    popup
      .setLngLat(e.lngLat)
      .setHTML(buildLeadCentreTooltipHtml(feature.properties as Record<string, unknown>, style))
      .addTo(map);
  });

  map.on('mouseleave', LEAD_CENTRE_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

// ── Attach hover + click handlers ────────────────────────────────────────────
