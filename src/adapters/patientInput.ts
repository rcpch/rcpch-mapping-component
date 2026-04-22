import type { Feature, FeatureCollection, Point } from 'geojson';
import type { PatientInput, PatientRecord } from '../types/public';
import { validatePatientPoint } from '../utils/validation';

export interface NormalizeResult {
  features: FeatureCollection<Point>['features'];
  warnings: Array<{ code: string; message: string; details?: unknown }>;
}

interface NormalizeOptions {
  strict?: boolean;
}

function isGeoJsonFeatureCollection(data: unknown): data is FeatureCollection<Point> {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'FeatureCollection' &&
    Array.isArray((data as { features?: unknown }).features)
  );
}

function isGeoJsonFeature(data: unknown): data is Feature<Point> {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'Feature'
  );
}

/**
 * Normalize any supported PatientInput form into a list of GeoJSON Point features
 * suitable for passing directly to a MapLibre GeoJSON source.
 *
 * Invalid records are skipped and surfaced as warnings.
 * Records outside UK bounds are surfaced as warnings but still skipped to
 * avoid misleading the map.
 */
export function normalizePatientInput(
  data: PatientInput,
  options?: NormalizeOptions,
): NormalizeResult {
  const features: FeatureCollection<Point>['features'] = [];
  const warnings: NormalizeResult['warnings'] = [];
  const strict = options?.strict === true;

  let records: PatientRecord[];

  if (isGeoJsonFeatureCollection(data)) {
    // Extract coordinates + properties from each feature
    records = data.features.map((f) => ({
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      ...f.properties,
    }));
  } else if (Array.isArray(data)) {
    // Could be Feature[] or PatientRecord[]
    records = data.map((item) =>
      isGeoJsonFeature(item)
        ? { lat: item.geometry.coordinates[1], lon: item.geometry.coordinates[0], ...item.properties }
        : (item as PatientRecord),
    );
  } else {
    if (strict) {
      throw new Error('[rcpch-imd-map] PatientInput must be an array or GeoJSON FeatureCollection.');
    }
    warnings.push({ code: 'INVALID_INPUT', message: 'PatientInput must be an array or GeoJSON FeatureCollection.' });
    return { features, warnings };
  }

  for (let i = 0; i < records.length; i++) {
    const { point, errors } = validatePatientPoint(records[i]);

    if (!point) {
      if (strict) {
        throw new Error(
          `[rcpch-imd-map] Patient record at index ${i} is invalid: ${errors.join('; ')}`,
        );
      }
      warnings.push({
        code: 'INVALID_PATIENT_POINT',
        message: `Patient record at index ${i} is invalid and will be skipped: ${errors.join('; ')}`,
        details: { index: i, errors },
      });
      continue;
    }

    // Non-fatal warnings (e.g., outside UK bounds already handled in validatePatientPoint)
    for (const err of errors) {
      warnings.push({ code: 'PATIENT_POINT_WARNING', message: err, details: { index: i } });
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [point.lon, point.lat] },
      properties: {
        id: point.id ?? `patient-${i}`,
        weight: point.weight ?? 1,
        group: point.group ?? null,
        ...point.properties,
      },
    });
  }

  return { features, warnings };
}
