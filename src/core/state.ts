import type { Nation, Era, ImdMapState } from '../types/public';
import { resolveEffectiveEra } from './resolver';

export function createInitialState(nation: Nation = 'all', era: Era = '2021'): ImdMapState {
  return {
    nation,
    era,
    effectiveEra: resolveEffectiveEra(nation, era),
    hasPatients: false,
    hasLeadCentre: false,
    overlays: {
      localAuthority: false,
      nhser: false,
      icb: false,
      lhb: false,
    },
  };
}
