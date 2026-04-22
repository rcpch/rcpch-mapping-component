import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { getLegendRows } from '../../src/map/legend';

describe('getLegendRows', () => {
  it('returns only rows enabled by visibility config', () => {
    const state = createInitialState('all', '2021');
    const rows = getLegendRows(state, {
      localAuthority: true,
      nhser: true,
      icb: false,
      lhb: false,
    });

    expect(rows.map((r) => r.key)).toEqual(['nhser', 'localAuthority']);
  });

  it('reflects active overlay state in returned rows', () => {
    const state = {
      ...createInitialState('all', '2021'),
      overlays: {
        localAuthority: true,
        nhser: false,
        icb: true,
        lhb: false,
      },
    };

    const rows = getLegendRows(state, {
      localAuthority: true,
      nhser: true,
      icb: true,
      lhb: true,
    });

    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.localAuthority.isActive).toBe(true);
    expect(byKey.nhser.isActive).toBe(false);
    expect(byKey.icb.isActive).toBe(true);
    expect(byKey.lhb.isActive).toBe(false);
  });

  it('includes LHB row in all-UK and Wales views', () => {
    const allUk = createInitialState('all', '2021');
    const wales = createInitialState('wales', '2011');

    const allRows = getLegendRows(allUk, {
      localAuthority: true,
      nhser: true,
      icb: true,
      lhb: true,
    });
    const walesRows = getLegendRows(wales, {
      localAuthority: true,
      nhser: true,
      icb: true,
      lhb: true,
    });

    expect(allRows.some((r) => r.key === 'lhb')).toBe(true);
    expect(walesRows.some((r) => r.key === 'lhb')).toBe(true);
  });

  it('shows england-only health rows as disabled in Wales view', () => {
    const wales = createInitialState('wales', '2011');

    const rows = getLegendRows(wales, {
      localAuthority: true,
      nhser: true,
      icb: true,
      lhb: true,
    });

    const nhser = rows.find((r) => r.key === 'nhser');
    const icb = rows.find((r) => r.key === 'icb');
    const lhb = rows.find((r) => r.key === 'lhb');

    expect(nhser).toBeDefined();
    expect(icb).toBeDefined();
    expect(lhb).toBeDefined();
    expect(nhser?.isEnabled).toBe(false);
    expect(icb?.isEnabled).toBe(false);
    expect(lhb?.isEnabled).toBe(true);
  });

  it('shows lhb row as disabled in england view', () => {
    const england = createInitialState('england', '2021');

    const rows = getLegendRows(england, {
      localAuthority: true,
      nhser: true,
      icb: true,
      lhb: true,
    });

    const lhb = rows.find((r) => r.key === 'lhb');
    expect(lhb).toBeDefined();
    expect(lhb?.isEnabled).toBe(false);
  });
});
