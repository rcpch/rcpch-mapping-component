import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveEra,
  willEraBeOverridden,
  resolveTileTableName,
  resolveFullTableName,
  buildTileUrl,
  resolveNationFilter,
} from '../../src/core/resolver';

describe('resolveEffectiveEra', () => {
  it('always returns 2011 for all-UK view regardless of requested era', () => {
    expect(resolveEffectiveEra('all', '2011')).toBe('2011');
    expect(resolveEffectiveEra('all', '2021')).toBe('2011');
  });

  it('honours the requested era for England', () => {
    expect(resolveEffectiveEra('england', '2011')).toBe('2011');
    expect(resolveEffectiveEra('england', '2021')).toBe('2021');
  });

  it('fixes Wales to 2011 regardless of requested era', () => {
    expect(resolveEffectiveEra('wales', '2011')).toBe('2011');
    expect(resolveEffectiveEra('wales', '2021')).toBe('2011');
  });

  it('fixes Scotland to 2011 regardless of requested era', () => {
    expect(resolveEffectiveEra('scotland', '2011')).toBe('2011');
    expect(resolveEffectiveEra('scotland', '2021')).toBe('2011');
  });

  it('fixes Northern Ireland to 2011 regardless of requested era', () => {
    expect(resolveEffectiveEra('northern_ireland', '2011')).toBe('2011');
    expect(resolveEffectiveEra('northern_ireland', '2021')).toBe('2011');
  });
});

describe('willEraBeOverridden', () => {
  it('returns true when all-UK nation is used with 2021 era', () => {
    expect(willEraBeOverridden('all', '2021')).toBe(true);
  });

  it('returns false when all-UK nation is used with 2011 era', () => {
    expect(willEraBeOverridden('all', '2011')).toBe(false);
  });

  it('returns false for England with any era', () => {
    expect(willEraBeOverridden('england', '2011')).toBe(false);
    expect(willEraBeOverridden('england', '2021')).toBe(false);
  });

  it('returns true for Wales / Scotland / NI when 2021 era is requested', () => {
    expect(willEraBeOverridden('wales', '2021')).toBe(true);
    expect(willEraBeOverridden('scotland', '2021')).toBe(true);
    expect(willEraBeOverridden('northern_ireland', '2021')).toBe(true);
  });
});

describe('resolveTileTableName', () => {
  // The census platform materializes tables as: uk_master_{era}_{zoom_tier}
  // Source-layer name in the PBF is the table name without schema prefix.

  it('returns uk_master_2011_z0_4 for 2011 era, low zoom tier', () => {
    expect(resolveTileTableName('2011', 'z0_4')).toBe('uk_master_2011_z0_4');
  });

  it('returns uk_master_2011_z5_7 for 2011 era, mid zoom tier', () => {
    expect(resolveTileTableName('2011', 'z5_7')).toBe('uk_master_2011_z5_7');
  });

  it('returns uk_master_2011_z8_10 for 2011 era, high zoom tier', () => {
    expect(resolveTileTableName('2011', 'z8_10')).toBe('uk_master_2011_z8_10');
  });

  it('returns uk_master_2021_z8_10 for 2021 era, high zoom tier', () => {
    expect(resolveTileTableName('2021', 'z8_10')).toBe('uk_master_2021_z8_10');
  });
});

describe('resolveFullTableName', () => {
  it('includes the public schema prefix', () => {
    expect(resolveFullTableName('2011', 'z0_4')).toBe('public.uk_master_2011_z0_4');
    expect(resolveFullTableName('2021', 'z8_10')).toBe('public.uk_master_2021_z8_10');
  });
});

describe('buildTileUrl', () => {
  it('builds a pg_tileserv tile URL template with schema-qualified table name', () => {
    expect(buildTileUrl('https://tiles.example.com', 'public.uk_master_2011_z0_4')).toBe(
      'https://tiles.example.com/public.uk_master_2011_z0_4/{z}/{x}/{y}.pbf',
    );
  });

  it('strips trailing slash from base URL', () => {
    expect(buildTileUrl('https://tiles.example.com/', 'public.uk_master_2021_z8_10')).toBe(
      'https://tiles.example.com/public.uk_master_2021_z8_10/{z}/{x}/{y}.pbf',
    );
  });

  it('works with a localhost tile server URL', () => {
    expect(buildTileUrl('http://localhost:7800', 'public.uk_master_2011_z5_7')).toBe(
      'http://localhost:7800/public.uk_master_2011_z5_7/{z}/{x}/{y}.pbf',
    );
  });
});

describe('resolveNationFilter', () => {
  it('returns null for all-UK (no filter)', () => {
    expect(resolveNationFilter('all')).toBeNull();
  });

  it('returns a MapLibre == filter expression for England', () => {
    expect(resolveNationFilter('england')).toEqual(['==', ['get', 'nation'], 'england']);
  });

  it('returns a filter for Wales', () => {
    expect(resolveNationFilter('wales')).toEqual(['==', ['get', 'nation'], 'wales']);
  });

  it('returns a filter for Scotland', () => {
    expect(resolveNationFilter('scotland')).toEqual(['==', ['get', 'nation'], 'scotland']);
  });

  it('returns a filter for Northern Ireland', () => {
    expect(resolveNationFilter('northern_ireland')).toEqual(['==', ['get', 'nation'], 'northern_ireland']);
  });
});

  it('honours the requested era for England', () => {
    expect(resolveEffectiveEra('england', '2011')).toBe('2011');
    expect(resolveEffectiveEra('england', '2021')).toBe('2021');
  });

  it('fixes Wales to 2011 regardless of requested era', () => {
    expect(resolveEffectiveEra('wales', '2011')).toBe('2011');
    expect(resolveEffectiveEra('wales', '2021')).toBe('2011');
  });

  it('fixes Scotland to 2011 regardless of requested era', () => {
    expect(resolveEffectiveEra('scotland', '2011')).toBe('2011');
    expect(resolveEffectiveEra('scotland', '2021')).toBe('2011');
  });

  it('fixes Northern Ireland to 2011 regardless of requested era', () => {
    expect(resolveEffectiveEra('northern_ireland', '2011')).toBe('2011');
    expect(resolveEffectiveEra('northern_ireland', '2021')).toBe('2011');
  });
