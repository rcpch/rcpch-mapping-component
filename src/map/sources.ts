import { GeoJSONSource, VectorTileSource } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { Era } from '../types/public';
import { ZOOM_TIERS, resolveFullTableName, buildTileUrl } from '../core/resolver';
import type { ZoomTier } from '../core/resolver';

// ── Choropleth source IDs ─────────────────────────────────────────────────────
//
// Three separate vector tile sources — one per zoom tier — are added to the map.
// MapLibre switches rendering automatically via minzoom/maxzoom on each layer.

export function choroplethSourceId(tier: ZoomTier): string {
  return `rcpch-imd-${tier}`;
}

export const ALL_CHOROPLETH_SOURCE_IDS = ZOOM_TIERS.map((t) => choroplethSourceId(t.tier));

export const PATIENTS_SOURCE_ID = 'rcpch-imd-patients';
export const LEAD_CENTRE_SOURCE_ID = 'rcpch-imd-lead-centre';

// ── Choropleth sources (3 per era) ────────────────────────────────────────────

/**
 * Add or update all three zoom-tier vector tile sources for the choropleth.
 * Existing sources for the same IDs are updated in-place via setTiles() to
 * avoid removing layers that depend on them.
 */
export function addOrUpdateChoroplethSources(
  map: MaplibreMap,
  tilesBaseUrl: string,
  effectiveEra: Era,
): void {
  for (const { tier } of ZOOM_TIERS) {
    const sourceId = choroplethSourceId(tier);
    const fullTableName = resolveFullTableName(effectiveEra, tier);
    const tileUrl = buildTileUrl(tilesBaseUrl, fullTableName);

    const existing = map.getSource(sourceId);
    if (existing instanceof VectorTileSource) {
      existing.setTiles([tileUrl]);
    } else {
      if (existing) map.removeSource(sourceId);
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 14,
      });
    }
  }
}

export function removeChoroplethSources(map: MaplibreMap): void {
  for (const id of ALL_CHOROPLETH_SOURCE_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

// ── Patient GeoJSON source ────────────────────────────────────────────────────

export function addOrUpdatePatientsSource(
  map: MaplibreMap,
  features: FeatureCollection<Point>['features'],
): void {
  const data: FeatureCollection<Point> = { type: 'FeatureCollection', features };
  const existing = map.getSource(PATIENTS_SOURCE_ID);
  if (existing instanceof GeoJSONSource) {
    existing.setData(data);
  } else {
    if (existing) map.removeSource(PATIENTS_SOURCE_ID);
    map.addSource(PATIENTS_SOURCE_ID, { type: 'geojson', data });
  }
}

// ── Lead-centre GeoJSON source ────────────────────────────────────────────────

export function addOrUpdateLeadCentreSource(
  map: MaplibreMap,
  feature: FeatureCollection<Point>['features'][number] | null,
): void {
  const data: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: feature ? [feature] : [],
  };
  const existing = map.getSource(LEAD_CENTRE_SOURCE_ID);
  if (existing instanceof GeoJSONSource) {
    existing.setData(data);
  } else {
    if (existing) map.removeSource(LEAD_CENTRE_SOURCE_ID);
    map.addSource(LEAD_CENTRE_SOURCE_ID, { type: 'geojson', data });
  }
}
