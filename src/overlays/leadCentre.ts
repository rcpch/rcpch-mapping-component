import type { Feature, FeatureCollection, Point } from 'geojson';
import type { LeadCentreInput, LeadCentreBubbleInput, LeadCentresOptions } from '../types/public';
import { validateLatLon } from '../utils/validation';

/**
 * Normalize any supported LeadCentreInput form into a single GeoJSON Point feature.
 * Returns null if the input cannot be resolved to valid coordinates.
 */
export function normalizeLeadCentreInput(
  data: LeadCentreInput,
): Feature<Point> | null {
  if (!data || typeof data !== 'object') return null;

  let lat: number;
  let lon: number;
  let label = 'Lead centre';

  // Accept a GeoJSON point feature
  if (data.type === 'Feature' && data.geometry?.type === 'Point') {
    [lon, lat] = data.geometry.coordinates;
    label = (data.properties?.label as string) ?? label;
  } else {
    const d = data as Record<string, unknown>;
    lat = (d.lat ?? d.latitude) as number;
    lon = (d.lon ?? d.lng ?? d.longitude) as number;
    label = (d.label as string) ?? label;
  }

  const { valid } = validateLatLon(lat, lon);
  if (!valid) return null;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: { label },
  };
}

/**
 * Normalize an array of LeadCentreBubbleInput entries into GeoJSON Point features.
 * Invalid entries are skipped (with a warning) or throw in strict mode.
 * All extra fields on each entry are preserved as GeoJSON feature properties.
 */
export function normalizeLeadCentresInput(
  data: LeadCentreBubbleInput[],
  options?: LeadCentresOptions,
  onWarning?: (w: { code: string; message: string; details?: unknown }) => void,
): FeatureCollection<Point>['features'] {
  const features: FeatureCollection<Point>['features'] = [];

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    if (!entry || typeof entry !== 'object') {
      const msg = `[rcpch-imd-map] setLeadCentres: entry at index ${i} is not an object — skipped.`;
      if (options?.strict) throw new Error(msg);
      onWarning?.({ code: 'INVALID_LEAD_CENTRE_ENTRY', message: msg, details: entry });
      continue;
    }

    const d = entry as Record<string, unknown>;
    const lat = (d.lat ?? d.latitude) as number | undefined;
    const lon = (d.lon ?? d.lng ?? d.longitude) as number | undefined;
    const label = typeof d.label === 'string' ? d.label : `Centre ${i + 1}`;

    if (lat === undefined || lon === undefined) {
      const msg = `[rcpch-imd-map] setLeadCentres: entry at index ${i} ("${label}") has no coordinates — skipped.`;
      if (options?.strict) throw new Error(msg);
      onWarning?.({ code: 'MISSING_LEAD_CENTRE_COORDS', message: msg, details: entry });
      continue;
    }

    const { valid } = validateLatLon(lat as number, lon as number);
    if (!valid) {
      const msg = `[rcpch-imd-map] setLeadCentres: entry at index ${i} ("${label}") has invalid coordinates (${lat}, ${lon}) — skipped.`;
      if (options?.strict) throw new Error(msg);
      onWarning?.({ code: 'INVALID_LEAD_CENTRE_COORDS', message: msg, details: entry });
      continue;
    }

    // Exclude coord alias keys from properties; preserve everything else.
    const { lat: _a, latitude: _b, lon: _c, lng: _d, longitude: _e, ...rest } = d;
    void _a; void _b; void _c; void _d; void _e;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon as number, lat as number] },
      properties: { label, ...rest },
    });
  }

  return features;
}
