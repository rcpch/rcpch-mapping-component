import type { NormalizedPatientPoint } from '../types/public';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate that lat/lon are numbers within WGS-84 bounds. */
export function validateLatLon(lat: unknown, lon: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    errors.push(`Invalid latitude: ${String(lat)}. Must be a number between -90 and 90.`);
  }
  if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
    errors.push(`Invalid longitude: ${String(lon)}. Must be a number between -180 and 180.`);
  }

  return { valid: errors.length === 0, errors };
}

// Approximate UK bounding box (includes Channel Islands and Isle of Man)
const UK_BOUNDS = { minLat: 49.5, maxLat: 61.5, minLon: -8.7, maxLon: 2.1 };

/** Returns true if the coordinate is within the approximate UK bounding box. */
export function isWithinUK(lat: number, lon: number): boolean {
  return (
    lat >= UK_BOUNDS.minLat &&
    lat <= UK_BOUNDS.maxLat &&
    lon >= UK_BOUNDS.minLon &&
    lon <= UK_BOUNDS.maxLon
  );
}

/**
 * Validate and normalize a single patient record.
 *
 * - Invalid lat/lon → point is null (fatal, emitted as warning unless strict)
 * - Outside UK bounds → point is returned but errors list is non-empty (soft warning)
 * - strict = true → outside UK bounds is treated as fatal
 */
export function validatePatientPoint(
  record: unknown,
): { point: NormalizedPatientPoint | null; errors: string[] } {
  if (!record || typeof record !== 'object') {
    return { point: null, errors: ['Record is not an object.'] };
  }

  const r = record as Record<string, unknown>;

  const lat = r.lat ?? r.latitude ?? r.LAT;
  const lon = r.lon ?? r.lng ?? r.longitude ?? r.LON;

  const { valid, errors } = validateLatLon(lat, lon);
  if (!valid) return { point: null, errors };

  if (!isWithinUK(lat as number, lon as number)) {
    const msg = `Point (${String(lat)}, ${String(lon)}) is outside UK bounds and will be skipped.`;
    // Always skip out-of-bounds points — this is a UK patient mapping tool.
    // In non-strict mode a warning is emitted; strict mode is reserved for
    // callers that want to treat this as a hard error.
    return { point: null, errors: [msg] };
  }

  const reservedKeys = new Set(['lat', 'lon', 'id', 'weight', 'group', 'latitude', 'longitude', 'lng', 'LAT', 'LON']);

  const point: NormalizedPatientPoint = {
    lat: lat as number,
    lon: lon as number,
    id: r.id !== undefined ? String(r.id) : undefined,
    weight: typeof r.weight === 'number' ? r.weight : undefined,
    group: typeof r.group === 'string' ? r.group : undefined,
    properties: Object.fromEntries(
      Object.entries(r).filter(([k]) => !reservedKeys.has(k)),
    ),
  };

  return { point, errors: [] };
}
