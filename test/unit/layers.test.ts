import { describe, it, expect } from 'vitest';
import { buildPatientCircleColorExpression } from '../../src/map/layers';
import { DEFAULT_STYLE } from '../../src/map/styles';

describe('buildPatientCircleColorExpression', () => {
  it('returns a flat fallback color when colorByGroup is empty', () => {
    const expr = buildPatientCircleColorExpression(DEFAULT_STYLE);
    expect(expr).toBe(DEFAULT_STYLE.patients.circleColor);
  });

  it('returns a match expression when colorByGroup entries are supplied', () => {
    const expr = buildPatientCircleColorExpression({
      ...DEFAULT_STYLE,
      patients: {
        ...DEFAULT_STYLE.patients,
        circleColor: '#111111',
        colorByGroup: {
          alpha: '#ff0000',
          beta: '#00ff00',
        },
      },
    });

    expect(Array.isArray(expr)).toBe(true);
    expect(expr).toEqual([
      'match',
      ['coalesce', ['to-string', ['get', 'group']], ''],
      'alpha',
      '#ff0000',
      'beta',
      '#00ff00',
      '#111111',
    ]);
  });
});
