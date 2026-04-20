# Changelog

All notable changes to `@rcpch/imd-map` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [0.1.0] — 2026-04-20

### Added

- `createImdMap(options)` — initializes a MapLibre GL choropleth map with IMD vector tiles.
- Nation and era selection via `setNation`, `setEra`, and `setView`.
- Era resolution rules: all-UK always uses 2011 era; England supports 2011 and 2021; Wales, Scotland, and Northern Ireland are fixed to 2011.
- Runtime style overrides for choropleth colors, fill opacity, border colors, patient circle styling, lead-centre styling, and tooltip labels/colors.
- `setPatients` — accepts plain record arrays, GeoJSON FeatureCollection, or Feature arrays.
- `setLeadCentre` — accepts a plain coordinate object or GeoJSON point feature.
- Built-in hover tooltip showing area name, IMD decile, and nation.
- `onAreaHover`, `onAreaClick`, `onViewChange`, and `onWarning` event hooks.
- ESM build (`dist/index.esm.js`) — maplibre-gl as peer dependency.
- Self-contained IIFE build (`dist/umd/rcpch-imd-map.min.js`) — maplibre-gl bundled.
- TypeScript declarations (`dist/index.d.ts`).
- Unit tests for era resolver, coordinate validation, property alias lookup, and patient input normalization.
- Standalone HTML examples covering basic usage and patient overlay.
