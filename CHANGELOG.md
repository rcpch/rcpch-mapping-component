# Changelog

All notable changes to `@rcpch/imd-map` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [0.5.2] — 2026-05-17

### Fixed

- Legend panel `max-height` now computed in JavaScript via `ResizeObserver` on the map
  container element, rather than CSS `calc(100% - 24px)`. The CSS approach failed because
  MapLibre ctrl container ancestors use `height: auto`, so the percentage resolved to nothing.
  The observer is disconnected in `destroy()` to prevent memory leaks.

## [0.5.1] — 2026-05-17

### Fixed

- Legend panel is now scrollable when its content exceeds the map container height — the header
  stays fixed and only the body scrolls, preventing the panel from overflowing off-screen.

## [0.5.0] — 2026-05-17

### Added

- **Multi-lead-centre bubble map** (`setLeadCentres()` / `clearLeadCentres()`) — closes issue #6.
  - Renders an array of lead centres as proportional symbol (bubble) circles: radius encodes a
    size metric (e.g. patient count), colour encodes a second metric (e.g. median HbA1c).
  - Two colour modes via `style.leadCentres.colorMode`:
    - `'continuous'` (default): numeric `colorField` linearly interpolated across a configurable
      colour scale (default blue → white → red); min/max auto-computed from data.
    - `'categorical'`: string `colorField` mapped to discrete colours via `colorByCategory`;
      tooltip shows a proportional breakdown bar chart for any `breakdownFields` supplied.
  - Hover tooltip shows centre label, size value, colour value, and either a mini gradient
    position bar (continuous) or per-category breakdown bars (categorical).
  - Legend gains a bubble size scale (3 representative circles) and a colour scale bar or
    category swatch list, shown only when `setLeadCentres()` has been called.
  - All field names, labels, and units are consumer-configurable via `style.leadCentres`.
  - Uses separate MapLibre source (`rcpch-imd-lead-centres`) and layer from the existing
    singular `setLeadCentre()` — fully backward compatible.
  - Invalid entries are skipped with `onWarning` callbacks or throw in `strict` mode.
- Added `hasLeadCentres: boolean` to `ImdMapState`.
- Added `LeadCentreBubbleInput`, `LeadCentresStyleOptions`, `LeadCentresOptions`,
  `LeadCentresBreakdownField` to the public type surface.

### Fixed

- Channel Islands tooltip now shows **N/A** for `imd_decile` and `imd_year` (previously
  rendered as `0` because no IMD data exists for the Channel Islands).
- Legend panel now hides completely when `nation === 'channel_islands'` — health boundary
  overlay rows (NHSER, ICBs, LHBs, local authorities) do not apply to that nation.

## [0.4.0] — 2026-05-16

### Added

- Added `channel_islands` as a supported nation value across the public API (`initialNation`, `setNation`, and nation-aware styling).
- Added resolver and filter support for `channel_islands` in nation filtering and era resolution.
- Added automated smoke tests for standalone example pages to verify they are served and include expected map initialization and patient plotting hooks.

### Changed

- Updated Channel Islands era behavior to honour the requested era (`2011` or `2021`) while rendering 2024 boundaries in both table families.
- Included Channel Islands in all-UK nation color matching so all-UK choropleth rendering handles `nation: channel_islands` explicitly.
- Added default neutral base color wiring for Channel Islands to support no-IMD-data rendering.

### Documentation

- Updated README and AGENTS guidance for Channel Islands nation support and era semantics.

## [0.3.1] — 2026-04-28

### Added

- Optional tile API key support via `tilesApiKey` and `tilesApiKeyParam` options in `CreateImdMapOptions`.
- Tile API key query parameters are appended to all choropleth and boundary overlay tile requests.
- Customizable query parameter name for tile auth (defaults to `api_key`).
- Unit test coverage for tile URL builder with optional auth and auth propagation across overlays.

### Documentation

- Updated README runtime tile configuration section with tile auth options and example usage.
- Added note that browser-delivered keys are non-secret and primarily useful for operational traffic control (rate limiting, revocation, origin restrictions).

## [0.3.0] — 2026-04-27

### Changed

- Updated all-UK era resolution so `initialNation: 'all'` honours the requested era instead of always forcing `2011`.
- Documented the mixed-vintage `uk_master_2021_*` UK tiles, where England uses 2021 LSOA boundaries with 2025 IMD data while Wales, Scotland, and Northern Ireland remain on their current older datasets.
- Clarified in the public docs that `era` refers to the LSOA boundary year, not the IMD publication year, and documented the England pairings of `2011` → 2011 LSOAs + 2019 IMD and `2021` → 2021 LSOAs + 2025 IMD.

## [0.2.0] — 2026-04-26

### Changed

- Switched local authority boundary overlay to zoom-tiered pg_tileserv tables (`public.la_tiles_z0_4`, `public.la_tiles_z5_7`, `public.la_tiles_z8_10`, `public.la_tiles_z11_14`) with tier-matched layer zoom windows.
- Switched health boundary overlays to zoom-tiered pg*tileserv tables for NHS England regions (`public.nhser_tiles_2021*_`), ICBs (`public.icb*tiles_2023*_`), and Welsh LHBs (`public.lhb*tiles_2022*\*`).
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
