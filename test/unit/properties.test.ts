import { describe, it, expect } from 'vitest';
import { getFeatureProperty } from '../../src/utils/properties';

// Sample properties as exposed by pg_tileserv from the uk_master_* tables.
// Canonical names: code, area_name, imd_decile, nation, year, imd_year
const ukMasterProps = {
  code: 'E01000001',
  area_name: 'City of London 001A',
  imd_decile: 3,
  nation: 'england',
  year: '2011',
  imd_year: '2019',
};

describe('getFeatureProperty — uk_master_* canonical names', () => {
  it('finds code by exact canonical name', () => {
    expect(getFeatureProperty(ukMasterProps, 'code')).toBe('E01000001');
  });

  it('finds area_name by exact canonical name', () => {
    expect(getFeatureProperty(ukMasterProps, 'area_name')).toBe('City of London 001A');
  });

  it('finds imd_decile by exact canonical name', () => {
    expect(getFeatureProperty(ukMasterProps, 'imd_decile')).toBe(3);
  });

  it('finds nation by exact canonical name', () => {
    expect(getFeatureProperty(ukMasterProps, 'nation')).toBe('england');
  });
});

describe('getFeatureProperty — alias resolution (older tile schema variants)', () => {
  it('finds code via lsoa_code alias (lsoa_tiles_* family)', () => {
    expect(getFeatureProperty({ lsoa_code: 'E01000001' }, 'code')).toBe('E01000001');
  });

  it('finds code via LSOA11CD alias (legacy tile property casing)', () => {
    expect(getFeatureProperty({ LSOA11CD: 'E01000001' }, 'code')).toBe('E01000001');
  });

  it('finds area_name via LSOA11NM alias', () => {
    expect(getFeatureProperty({ LSOA11NM: 'City of London 001A' }, 'area_name')).toBe('City of London 001A');
  });

  it('finds imd_decile via IMD_Decile alias', () => {
    expect(getFeatureProperty({ IMD_Decile: 5 }, 'imd_decile')).toBe(5);
  });

  it('finds nation via Nation alias', () => {
    expect(getFeatureProperty({ Nation: 'wales' }, 'nation')).toBe('wales');
  });
});

describe('getFeatureProperty — fallback behaviors', () => {
  it('falls back to case-insensitive match for unknown aliases', () => {
    expect(getFeatureProperty({ Score: 99 }, 'score')).toBe(99);
  });

  it('returns undefined for a key that does not exist', () => {
    expect(getFeatureProperty(ukMasterProps, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for null properties', () => {
    expect(getFeatureProperty(null, 'imd_decile')).toBeUndefined();
  });

  it('returns undefined for undefined properties', () => {
    expect(getFeatureProperty(undefined, 'imd_decile')).toBeUndefined();
  });
});
