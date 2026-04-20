import { Map as MaplibreMap, Popup, AttributionControl } from 'maplibre-gl';
import type { Feature, Point } from 'geojson';
import type {
  CreateImdMapOptions,
  ImdMapInstance,
  Nation,
  Era,
  MapStyleOptions,
  PatientInput,
  PatientLayerOptions,
  LeadCentreInput,
  LeadCentreOptions,
} from '../types/public';
import { createInitialState } from './state';
import { resolveEffectiveEra, willEraBeOverridden } from './resolver';
import {
  addOrUpdateChoroplethSources,
  addOrUpdatePatientsSource,
  addOrUpdateLeadCentreSource,
  PATIENTS_SOURCE_ID,
  LEAD_CENTRE_SOURCE_ID,
} from '../map/sources';
import {
  addChoroplethLayers,
  removeChoroplethLayers,
  updateChoroplethStyle,
  updateChoroplethNationFilter,
  addOrUpdatePatientsLayer,
  removePatientsLayer,
  addOrUpdateLeadCentreLayer,
  removeLeadCentreLayer,
} from '../map/layers';
import {
  attachChoroplethInteraction,
  attachPatientInteraction,
  attachLeadCentreInteraction,
} from '../map/popups';
import { normalizePatientInput } from '../adapters/patientInput';
import { normalizeLeadCentreInput } from '../overlays/leadCentre';
import { mergeStyle, DEFAULT_STYLE } from '../map/styles';
import { logger } from '../utils/logging';

// Default center and zoom for a UK-wide view
const UK_CENTER: [number, number] = [-2.5, 54.0];
const UK_ZOOM = 5;

export function createImdMap(options: CreateImdMapOptions): ImdMapInstance {
  // ── Resolve container ───────────────────────────────────────────────────────
  const containerEl =
    typeof options.container === 'string'
      ? document.getElementById(options.container)
      : options.container;

  if (!containerEl) {
    throw new Error(
      `[rcpch-imd-map] Container not found: "${String(options.container)}". Ensure the element exists in the DOM before calling createImdMap.`,
    );
  }

  const tilesBaseUrl = options.tilesBaseUrl ?? '';
  if (!tilesBaseUrl) {
    logger.warn('No tilesBaseUrl provided. Choropleth tiles will not load.');
  }

  // ── Resolve style and initial state ────────────────────────────────────────
  let resolvedStyle = mergeStyle(DEFAULT_STYLE, options.style);
  let state = createInitialState(options.initialNation ?? 'all', options.initialEra ?? '2021');

  // Emit warning if the requested era will be silently overridden
  if (
    options.initialNation &&
    options.initialEra &&
    willEraBeOverridden(options.initialNation, options.initialEra)
  ) {
    const warning = {
      code: 'ERA_OVERRIDE',
      message: `Era '${options.initialEra}' is not supported for nation '${options.initialNation}'. Effective era will be '${state.effectiveEra}'.`,
    };
    logger.warn(warning.message);
    options.onWarning?.(warning);
  }

  // ── Create MapLibre map ─────────────────────────────────────────────────────
  const map = new MaplibreMap({
    container: containerEl,
    style:
      options.mapStyleUrl ??
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: options.center ?? UK_CENTER,
    zoom: options.zoom ?? UK_ZOOM,
    attributionControl: false,
  });

  map.addControl(new AttributionControl({ compact: true }));

  const popup = new Popup({ closeButton: false, closeOnClick: false });

  // ── Queued data (set before map finishes loading) ───────────────────────────
  let mapLoaded = false;
  let pendingPatientFeatures: Feature<Point>[] | null = null;
  let pendingLeadCentreFeature: Feature<Point> | null = null;
  let pendingFitToData: { zoom: number } | null = null;
  let patientInteractionAttached = false;
  let leadCentreInteractionAttached = false;

  // ── Stored lead centre coordinate for fitToData() ───────────────────────────
  let storedLeadCentreCoord: [number, number] | null = null;

  logger.debug(`tilesBaseUrl resolved to: "${tilesBaseUrl}"`);

  // ── Map load handler ────────────────────────────────────────────────────────
  map.on('load', () => {
    mapLoaded = true;

    if (tilesBaseUrl) {
      addOrUpdateChoroplethSources(map, tilesBaseUrl, state.effectiveEra);
      addChoroplethLayers(map, state.nation, state.effectiveEra, resolvedStyle);
    }

    attachChoroplethInteraction(map, popup, resolvedStyle, options);

    if (pendingPatientFeatures) {
      addOrUpdatePatientsSource(map, pendingPatientFeatures);
      addOrUpdatePatientsLayer(map, resolvedStyle);
      if (!patientInteractionAttached) {
        attachPatientInteraction(map, popup, resolvedStyle);
        patientInteractionAttached = true;
      }
      state = { ...state, hasPatients: true };
      pendingPatientFeatures = null;
    }

    if (pendingLeadCentreFeature) {
      storedLeadCentreCoord = pendingLeadCentreFeature.geometry.coordinates as [number, number];
      addOrUpdateLeadCentreSource(map, pendingLeadCentreFeature);
      addOrUpdateLeadCentreLayer(map, resolvedStyle);
      if (!leadCentreInteractionAttached) {
        attachLeadCentreInteraction(map, popup, resolvedStyle);
        leadCentreInteractionAttached = true;
      }
      state = { ...state, hasLeadCentre: true };
      pendingLeadCentreFeature = null;
    }

    if (pendingFitToData) {
      const zoom = pendingFitToData.zoom;
      if (storedLeadCentreCoord) {
        const [lon, lat] = storedLeadCentreCoord;
        // Defer flyTo until after first idle to avoid interrupting layer rendering
        map.once('idle', () => {
          map.flyTo({ center: [lon, lat], zoom });
        });
      } else {
        logger.warn('No lead centre data to fit to.');
      }
      pendingFitToData = null;
    }
  });

  // ── Internal helpers ────────────────────────────────────────────────────────

  function applyViewChange(newNation: Nation, newEra: Era): void {
    const newEffectiveEra = resolveEffectiveEra(newNation, newEra);

    if (willEraBeOverridden(newNation, newEra)) {
      const warning = {
        code: 'ERA_OVERRIDE',
        message: `Era '${newEra}' overridden to '${newEffectiveEra}' for nation '${newNation}'.`,
      };
      logger.warn(warning.message);
      options.onWarning?.(warning);
    }

    const eraChanged = newEffectiveEra !== state.effectiveEra;
    const nationChanged = newNation !== state.nation;

    state = { ...state, nation: newNation, era: newEra, effectiveEra: newEffectiveEra };

    if (mapLoaded && tilesBaseUrl) {
      if (eraChanged) {
        // Era change: sources must serve new table family; rebuild layers.
        removeChoroplethLayers(map);
        addOrUpdateChoroplethSources(map, tilesBaseUrl, newEffectiveEra);
        addChoroplethLayers(map, newNation, newEffectiveEra, resolvedStyle);
      } else if (nationChanged) {
        // Nation change only: sources stay the same, just update filter expressions.
        updateChoroplethNationFilter(map, newNation, newEffectiveEra);
      }
    }

    options.onViewChange?.({ nation: newNation, era: newEra, effectiveEra: newEffectiveEra });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  const instance: ImdMapInstance = {
    setView({ nation, era } = {}) {
      applyViewChange(nation ?? state.nation, era ?? state.era);
    },

    setNation(nation) {
      applyViewChange(nation, state.era);
    },

    setEra(era) {
      applyViewChange(state.nation, era);
    },

    setStyle(newStyle: MapStyleOptions) {
      resolvedStyle = mergeStyle(DEFAULT_STYLE, newStyle);
      if (mapLoaded) {
        updateChoroplethStyle(map, state.nation, resolvedStyle);
      }
    },

    setOverlayVisibility(input) {
      // Overlay layer management will be added in Phase 2.
      state = { ...state, overlays: { ...state.overlays, ...input } };
      logger.debug('setOverlayVisibility: boundary overlay layers will be implemented in Phase 2.');
    },

    setPatients(data: PatientInput, _patientOptions?: PatientLayerOptions) {
      const { features, warnings } = normalizePatientInput(data);

      for (const w of warnings) {
        logger.warn(w.message);
        options.onWarning?.(w);
      }

      if (!mapLoaded) {
        pendingPatientFeatures = features;
        return;
      }

      addOrUpdatePatientsSource(map, features);
      addOrUpdatePatientsLayer(map, resolvedStyle);
      if (!patientInteractionAttached) {
        attachPatientInteraction(map, popup, resolvedStyle);
        patientInteractionAttached = true;
      }
      state = { ...state, hasPatients: true };
    },

    clearPatients() {
      pendingPatientFeatures = null;
      if (!mapLoaded) return;
      removePatientsLayer(map);
      if (map.getSource(PATIENTS_SOURCE_ID)) map.removeSource(PATIENTS_SOURCE_ID);
      state = { ...state, hasPatients: false };
    },

    setLeadCentre(data: LeadCentreInput, _options?: LeadCentreOptions) {
      const feature = normalizeLeadCentreInput(data);
      if (!feature) {
        const warning = { code: 'INVALID_LEAD_CENTRE', message: 'Lead centre data could not be resolved to valid coordinates.' };
        logger.warn(warning.message);
        options.onWarning?.(warning);
        return;
      }

      if (!mapLoaded) {
        pendingLeadCentreFeature = feature;
        return;
      }

      storedLeadCentreCoord = feature.geometry.coordinates as [number, number];
      addOrUpdateLeadCentreSource(map, feature);
      addOrUpdateLeadCentreLayer(map, resolvedStyle);
      if (!leadCentreInteractionAttached) {
        attachLeadCentreInteraction(map, popup, resolvedStyle);
        leadCentreInteractionAttached = true;
      }
      state = { ...state, hasLeadCentre: true };
    },

    clearLeadCentre() {
      pendingLeadCentreFeature = null;
      storedLeadCentreCoord = null;
      if (!mapLoaded) return;
      removeLeadCentreLayer(map);
      if (map.getSource(LEAD_CENTRE_SOURCE_ID)) map.removeSource(LEAD_CENTRE_SOURCE_ID);
      state = { ...state, hasLeadCentre: false };
    },

    getState() {
      return { ...state };
    },

    resize() {
      map.resize();
    },

    fitToData(fitOptions?: { zoom?: number }) {
      const zoom = fitOptions?.zoom ?? 6;

      if (!mapLoaded) {
        pendingFitToData = { zoom };
        return;
      }

      if (!storedLeadCentreCoord) {
        logger.warn('No lead centre data to fit to.');
        return;
      }

      const [lon, lat] = storedLeadCentreCoord;
      map.flyTo({ center: [lon, lat], zoom });
    },

    destroy() {
      popup.remove();
      map.remove();
    },
  };

  return instance;
}
