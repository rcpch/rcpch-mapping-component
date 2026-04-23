import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STYLE,
  generateDecileRampFromBaseColor,
  getDecileColors,
  mergeStyle,
} from '../../src/map/styles';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

describe('styles', () => {
  it('includes a default area tooltip template', () => {
    expect(DEFAULT_STYLE.tooltip.areaTooltipText).toContain('{{areaName}}');
    expect(DEFAULT_STYLE.tooltip.areaTooltipText).toContain('{{imdDecile}}');
    expect(DEFAULT_STYLE.tooltip.areaTooltipText).toContain('{{nation}}');
  });

  it('generates a 10-step ramp from a base color', () => {
    const ramp = generateDecileRampFromBaseColor('#d7191c');
    expect(ramp).toHaveLength(10);
    expect(ramp.every(isHexColor)).toBe(true);
  });

  it('uses requested default base color direction per nation', () => {
    const england = getDecileColors('england', DEFAULT_STYLE);
    const wales = getDecileColors('wales', DEFAULT_STYLE);
    const scotland = getDecileColors('scotland', DEFAULT_STYLE);
    const northernIreland = getDecileColors('northern_ireland', DEFAULT_STYLE);

    const [er, eg, eb] = hexToRgb(england[4]);
    const [wr, wg, wb] = hexToRgb(wales[4]);
    const [sr, sg, sb] = hexToRgb(scotland[4]);
    const [nr, ng, nb] = hexToRgb(northernIreland[4]);

    expect(er).toBeGreaterThan(eg);
    expect(er).toBeGreaterThan(eb);

    expect(wg).toBeGreaterThan(wr);
    expect(wg).toBeGreaterThan(wb);

    expect(sb).toBeGreaterThan(sr);
    expect(sb).toBeGreaterThan(sg);

    expect(Math.abs(nr - ng)).toBeLessThan(12);
    expect(Math.abs(ng - nb)).toBeLessThan(12);
  });

  it('uses baseColorByNation to generate custom ramps', () => {
    const style = mergeStyle(DEFAULT_STYLE, {
      choropleth: {
        baseColorByNation: {
          wales: '#00aa33',
        },
      },
    });

    const ramp = getDecileColors('wales', style);
    const closest = Math.min(...ramp.map((c) => colorDistance(c, '#00aa33')));

    expect(ramp).toHaveLength(10);
    expect(closest).toBeLessThan(35);
  });

  it('prefers explicit decileColorsByNation over baseColorByNation', () => {
    const explicit = [
      '#110000', '#220000', '#330000', '#440000', '#550000',
      '#660000', '#770000', '#880000', '#990000', '#aa0000',
    ];

    const style = mergeStyle(DEFAULT_STYLE, {
      choropleth: {
        baseColorByNation: {
          england: '#00ff00',
        },
        decileColorsByNation: {
          england: explicit,
        },
      },
    });

    expect(getDecileColors('england', style)).toEqual(explicit);
  });
});
