import { Popup } from 'maplibre-gl';
import type { Map as MaplibreMap, MapMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import type {
  CreateImdMapOptions,
  MapStyleOptions,
  AreaHoverPayload,
} from '../types/public';
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

export function buildChoroplethTooltipHtmlFromTemplate(
  properties: Record<string, unknown> | null | undefined,
  style: Required<MapStyleOptions>,
): string {
  const t = style.tooltip;
  const bg = t.backgroundColor ?? '#0d0d58';
  const color = t.textColor ?? '#ffffff';
  const radius = t.borderRadius ?? 4;

  const areaCode = getFeatureProperty(properties, 'code');
  const areaName = getFeatureProperty(properties, 'area_name') ?? 'Unknown area';
  const areaType = getFeatureProperty(properties, 'area_type') ?? 'LSOA';
  const nation = getFeatureProperty(properties, 'nation') ?? '–';
  const imdDecile = getFeatureProperty(properties, 'imd_decile') ?? '–';
  const imdYear = getFeatureProperty(properties, 'imd_year') ?? '–';
  const boundaryYear = getFeatureProperty(properties, 'year') ?? '–';
  const laCode = getFeatureProperty(properties, 'la_code') ?? '';
  const laName = getFeatureProperty(properties, 'la_name') ?? '';
  const laYear = getFeatureProperty(properties, 'la_year') ?? '';
  const nhserCode = getFeatureProperty(properties, 'nhser_code') ?? '';
  const nhserName = getFeatureProperty(properties, 'nhser_name') ?? '';
  const icbCode = getFeatureProperty(properties, 'icb_code') ?? '';
  const icbName = getFeatureProperty(properties, 'icb_name') ?? '';
  const lhbCode = getFeatureProperty(properties, 'lhb_code') ?? '';
  const lhbName = getFeatureProperty(properties, 'lhb_name') ?? '';

  const template =
    t.areaTooltipText ??
    '<strong>{{areaName}}</strong><br/><span>{{decileLabel}}: {{imdDecile}}</span>';

  const text = interpolateTemplate(template, {
    ...(properties ?? {}),
    areaCode,
    areaName,
    areaType,
    nation,
    imdDecile,
    imdYear,
    boundaryYear,
    laCode,
    laName,
    laYear,
    nhserCode,
    nhserName,
    icbCode,
    icbName,
    lhbCode,
    lhbName,
    decileLabel: t.decileLabel ?? 'IMD decile',
    nationLabel: t.nationLabel ?? 'Nation',
  });

  return `<div style="background:${bg};color:${color};padding:8px 12px;border-radius:${radius}px;font-size:13px;line-height:1.6;font-family:sans-serif;">
  <span>${text}</span>
</div>`;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
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
  lngLat: { lng: number; lat: number },
): AreaHoverPayload {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const areaCode = getFeatureProperty(props, 'code');
  const areaName = getFeatureProperty(props, 'area_name');
  const areaType = getFeatureProperty(props, 'area_type');
  const nation = getFeatureProperty(props, 'nation');
  const imdDecile = toOptionalNumber(getFeatureProperty(props, 'imd_decile'));
  const imdYear = toOptionalNumber(getFeatureProperty(props, 'imd_year'));
  const boundaryYear = toOptionalNumber(getFeatureProperty(props, 'year'));
  const laCode = getFeatureProperty(props, 'la_code');
  const laName = getFeatureProperty(props, 'la_name');
  const laYear = toOptionalNumber(getFeatureProperty(props, 'la_year'));
  const nhserCode = getFeatureProperty(props, 'nhser_code');
  const nhserName = getFeatureProperty(props, 'nhser_name');
  const icbCode = getFeatureProperty(props, 'icb_code');
  const icbName = getFeatureProperty(props, 'icb_name');
  const lhbCode = getFeatureProperty(props, 'lhb_code');
  const lhbName = getFeatureProperty(props, 'lhb_name');

  return {
    areaCode: areaCode === undefined || areaCode === null ? undefined : String(areaCode),
    areaName: areaName === undefined || areaName === null ? undefined : String(areaName),
    areaType: areaType === undefined || areaType === null ? undefined : String(areaType),
    nation: nation === undefined || nation === null ? undefined : String(nation),
    imdDecile,
    imdYear,
    boundaryYear,
    laCode: laCode === undefined || laCode === null ? undefined : String(laCode),
    laName: laName === undefined || laName === null ? undefined : String(laName),
    laYear,
    nhserCode: nhserCode === undefined || nhserCode === null ? undefined : String(nhserCode),
    nhserName: nhserName === undefined || nhserName === null ? undefined : String(nhserName),
    icbCode: icbCode === undefined || icbCode === null ? undefined : String(icbCode),
    icbName: icbName === undefined || icbName === null ? undefined : String(icbName),
    lhbCode: lhbCode === undefined || lhbCode === null ? undefined : String(lhbCode),
    lhbName: lhbName === undefined || lhbName === null ? undefined : String(lhbName),
    lngLat,
    lsoaCode: areaCode === undefined || areaCode === null ? undefined : String(areaCode),
    lsoaName: areaName === undefined || areaName === null ? undefined : String(areaName),
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
  options: Pick<CreateImdMapOptions, 'onAreaHover' | 'onAreaClick' | 'areaTooltipMode'>,
): void {
  // All fill layer IDs from all zoom tiers
  const fillLayers = ALL_CHOROPLETH_LAYER_IDS.filter((id) => id.startsWith('rcpch-imd-fill-'));

  for (const layerId of fillLayers) {
    map.on('mousemove', layerId, (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (!features.length) return;

      map.getCanvas().style.cursor = 'pointer';

      const feature = features[0];
      const areaTooltipMode = options.areaTooltipMode ?? 'default';
      if (areaTooltipMode !== 'none') {
        const html =
          areaTooltipMode === 'template'
            ? buildChoroplethTooltipHtmlFromTemplate(
                feature.properties as Record<string, unknown>,
                style,
              )
            : buildChoroplethTooltipHtml(feature.properties as Record<string, unknown>, style);

        popup
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      }

      options.onAreaHover?.(featureToPayload(feature, { lng: e.lngLat.lng, lat: e.lngLat.lat }));
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('click', layerId, (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (!features.length) return;
      options.onAreaClick?.(featureToPayload(features[0], { lng: e.lngLat.lng, lat: e.lngLat.lat }));
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
