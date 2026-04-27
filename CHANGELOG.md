# Changelog

All notable changes to `@rcpch/imd-map` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [0.3.0] — 2026-04-27

### Changed

- Updated all-UK era resolution so `initialNation: 'all'` honours the requested era instead of always forcing `2011`.
- Documented the mixed-vintage `uk_master_2021_*` UK tiles, where England uses 2021 LSOA boundaries with 2025 IMD data while Wales, Scotland, and Northern Ireland remain on their current older datasets.
- Clarified in the public docs that `era` refers to the LSOA boundary year, not the IMD publication year, and documented the England pairings of `2011` → 2011 LSOAs + 2019 IMD and `2021` → 2021 LSOAs + 2025 IMD.

## [0.2.0] — 2026-04-26

### Changed

- Switched local authority boundary overlay to zoom-tiered pg_tileserv tables (`public.la_tiles_z0_4`, `public.la_tiles_z5_7`, `public.la_tiles_z8_10`, `public.la_tiles_z11_14`) with tier-matched layer zoom windows.
- Switched health boundary overlays to zoom-tiered pg_tileserv tables for NHS England regions (`public.nhser_tiles_2021_*`), ICBs (`public.icb_tiles_2023_*`), and Welsh LHBs (`public.lhb_tiles_2022_*`).
- Corrected overlay `source-layer` usage to match deployed overlay vector tiles by using schema-qualified layer names (for example `public.la_tiles_z5_7`) and keeping `source-layer` equal to the URL table id.
- Updated overlay visibility handling so hide/show applies across all zoom-tier boundary layers.

### Added

- Unit tests covering tiered overlay source/layer creation, source-layer naming, and overlay hide behavior across tiers.

## [0.1.0] — 2026-04-20

### Added

- `createImdMap(options)` — initializes a MapLibre GL choropleth map with IMD vector tiles.
- Nation and era selection via `setNation`, `setEra`, and `setView`.
- Era resolution rules: all-UK always uses 2011 era; England supports 2011 and 2021; Wales, Scotland, and Northern Ireland are fixed to 2011.
- Runtime style overrides for choropleth colors, fill opacity, border colors, patient circle styling, lead-centre styling, and tooltip labels/colors.
- `setPatients` — accepts plain record arrays, GeoJSON FeatureCollection, or Feature arrays.
- `setLeadCentre` — accepts a plain coordinate object or GeoJSON point feature.
- Local authority and health boundary overlays (NHSER, ICB, LHB) via `setOverlayVisibility` and startup flags.
- Collapsible corner legend with clickable overlay toggles, compact key, and per-row visibility controls.
- Patient group color mapping support via `style.patients.colorByGroup`.
- MIT `LICENSE` file.
- GitHub Actions CI workflow running `npm test` and `npm run build` on push/PR.
- Built-in hover tooltip showing area name, IMD decile, and nation.
- `onAreaHover`, `onAreaClick`, `onViewChange`, and `onWarning` event hooks.
- ESM build (`dist/index.esm.js`) — maplibre-gl as peer dependency.
- Self-contained IIFE build (`dist/umd/rcpch-imd-map.min.js`) — maplibre-gl bundled.
- TypeScript declarations (`dist/index.d.ts`).
- Unit tests for era resolver, coordinate validation, property alias lookup, and patient input normalization.
- Standalone HTML examples covering basic usage and patient overlay.

### Changed

- `fitToData` now fits to all plotted points (patients + lead centre), with optional padding for multi-point bounds.
