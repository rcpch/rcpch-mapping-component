import { describe, it, expect } from 'vitest';
import { validateLatLon, isWithinUK, validatePatientPoint } from '../../src/utils/validation';

describe('validateLatLon', () => {
  it('accepts valid UK coordinates', () => {
    expect(validateLatLon(51.5074, -0.1278).valid).toBe(true);
    expect(validateLatLon(53.4808, -2.2426).valid).toBe(true);
  });

  it('rejects latitude out of range', () => {
    const r = validateLatLon(91, 0);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/latitude/i);
  });

  it('rejects longitude out of range', () => {
    const r = validateLatLon(50, 181);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/longitude/i);
  });

  it('rejects NaN values', () => {
    expect(validateLatLon(NaN, 0).valid).toBe(false);
    expect(validateLatLon(0, NaN).valid).toBe(false);
  });

  it('rejects non-numeric values', () => {
    expect(validateLatLon('51', 0).valid).toBe(false);
    expect(validateLatLon(null, 0).valid).toBe(false);
    expect(validateLatLon(undefined, undefined).valid).toBe(false);
  });
});

describe('isWithinUK', () => {
  it('returns true for London', () => {
    expect(isWithinUK(51.5074, -0.1278)).toBe(true);
  });

  it('returns true for Edinburgh', () => {
    expect(isWithinUK(55.9533, -3.1883)).toBe(true);
  });

  it('returns false for Paris', () => {
    expect(isWithinUK(48.8566, 2.3522)).toBe(false);
  });

  it('returns false for New York', () => {
    expect(isWithinUK(40.7128, -74.0060)).toBe(false);
  });
});

describe('validatePatientPoint', () => {
  it('normalizes a valid plain record', () => {
    const { point, errors } = validatePatientPoint({ id: 'p1', lat: 51.5, lon: -0.1 });
    expect(point).not.toBeNull();
    expect(point?.lat).toBe(51.5);
    expect(point?.lon).toBe(-0.1);
    expect(point?.id).toBe('p1');
    expect(errors).toHaveLength(0);
  });

  it('accepts latitude / longitude as alternative field names', () => {
    const { point } = validatePatientPoint({ latitude: 53.48, longitude: -2.24 });
    expect(point?.lat).toBe(53.48);
    expect(point?.lon).toBe(-2.24);
  });

  it('returns null for a non-object record', () => {
    expect(validatePatientPoint(null).point).toBeNull();
    expect(validatePatientPoint('hello').point).toBeNull();
    expect(validatePatientPoint(42).point).toBeNull();
  });

  it('returns null when lat/lon are missing', () => {
    expect(validatePatientPoint({ id: 'p1' }).point).toBeNull();
  });

  it('returns a soft warning (not null) for a point outside UK bounds', () => {
    const { point, errors } = validatePatientPoint({ lat: 48.8, lon: 2.3 });
    expect(point).toBeNull(); // outside UK is skipped
    expect(errors[0]).toMatch(/UK bounds/i);
  });

  it('in strict mode, returns null for points outside UK bounds', () => {
    const { point } = validatePatientPoint({ lat: 48.8, lon: 2.3 }, true);
    expect(point).toBeNull();
  });

  it('strips reserved keys from the properties bag', () => {
    const { point } = validatePatientPoint({ lat: 51.5, lon: -0.1, deprivation_score: 3 });
    expect(point?.properties?.deprivation_score).toBe(3);
    expect(point?.properties?.lat).toBeUndefined();
  });
});
