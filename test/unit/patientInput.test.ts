import { describe, it, expect } from 'vitest';
import { normalizePatientInput } from '../../src/adapters/patientInput';
import type { PatientRecord } from '../../src/types/public';

const validRecords: PatientRecord[] = [
  { id: 'p1', lat: 51.5074, lon: -0.1278 },
  { id: 'p2', lat: 53.4808, lon: -2.2426 },
];

describe('normalizePatientInput — array of records', () => {
  it('converts valid records to GeoJSON features', () => {
    const { features, warnings } = normalizePatientInput(validRecords);
    expect(features).toHaveLength(2);
    expect(warnings).toHaveLength(0);
    expect(features[0].geometry.coordinates).toEqual([-0.1278, 51.5074]);
    expect(features[0].properties?.id).toBe('p1');
  });

  it('skips invalid records and emits a warning for each', () => {
    const mixed: PatientRecord[] = [
      { id: 'good', lat: 51.5, lon: -0.1 },
      { id: 'bad' }, // missing lat/lon
    ];
    const { features, warnings } = normalizePatientInput(mixed);
    expect(features).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('INVALID_PATIENT_POINT');
  });

  it('skips points outside UK bounds and emits a warning', () => {
    const overseas: PatientRecord[] = [{ id: 'paris', lat: 48.85, lon: 2.35 }];
    const { features, warnings } = normalizePatientInput(overseas);
    expect(features).toHaveLength(0);
    expect(warnings[0].code).toBe('INVALID_PATIENT_POINT');
  });

  it('assigns an auto id when id field is absent', () => {
    const { features } = normalizePatientInput([{ lat: 51.5, lon: -0.1 }]);
    expect(features[0].properties?.id).toBe('patient-0');
  });
});

describe('normalizePatientInput — GeoJSON FeatureCollection', () => {
  it('converts a FeatureCollection to features', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.1278, 51.5074] },
          properties: { id: 'fc-1', group: 'A' },
        },
      ],
    };
    const { features, warnings } = normalizePatientInput(geojson);
    expect(features).toHaveLength(1);
    expect(warnings).toHaveLength(0);
    expect(features[0].properties?.group).toBe('A');
  });
});

describe('normalizePatientInput — invalid input', () => {
  it('returns an empty result with a warning for non-array non-FeatureCollection input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { features, warnings } = normalizePatientInput('not valid' as any);
    expect(features).toHaveLength(0);
    expect(warnings[0].code).toBe('INVALID_INPUT');
  });

  it('throws on invalid input in strict mode', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => normalizePatientInput('not valid' as any, { strict: true })).toThrow();
  });

  it('throws on first invalid patient record in strict mode', () => {
    const mixed: PatientRecord[] = [
      { id: 'good', lat: 51.5, lon: -0.1 },
      { id: 'bad' },
    ];

    expect(() => normalizePatientInput(mixed, { strict: true })).toThrow(
      /Patient record at index 1 is invalid/,
    );
  });
});
