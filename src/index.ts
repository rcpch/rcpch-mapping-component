// Public entry point for @rcpch/imd-map
// Consumers should import from this module (or use the UMD global RcpchImdMap).

export { createImdMap } from './core/createImdMap';

// Re-export all public types for TypeScript consumers.
export type {
  Nation,
  Era,
  CreateImdMapOptions,
  ImdMapInstance,
  ImdMapState,
  MapStyleOptions,
  ChoroplethStyleOptions,
  BoundaryStyleOptions,
  PatientStyleOptions,
  LeadCentreStyleOptions,
  TooltipStyleOptions,
  PatientInput,
  PatientRecord,
  PatientLayerOptions,
  NormalizedPatientPoint,
  LeadCentreInput,
  LeadCentreOptions,
  AreaHoverPayload,
  AreaClickPayload,
} from './types/public';
