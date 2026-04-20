import type { Feature, Point } from 'geojson';
import type { LeadCentreInput } from '../types/public';
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
