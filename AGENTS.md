# AGENTS.md

This file is the quick operational guide for coding agents and LLM tools working in this repository.
It complements, not replaces, the consumer-facing documentation in `README.md`.

## Project at a glance

- Package: `@rcpch/imd-map`
- Purpose: browser-first UK deprivation choropleth using MapLibre GL JS with optional patient, lead-centre, and administrative boundary overlays
- Primary consumer modes:
  - npm/bundler consumers via ESM build
  - script-tag / Django / HTMX consumers via self-contained UMD build
- Rendering backend: pg_tileserv serving PostGIS vector tiles from rcpch-census-platform
- Upstream backend/data repo: `https://github.com/rcpch/rcpch-census-platform`
- Live reference demo: `https://rcpch.github.io/rcpch-census-platform/`

## Repository structure

- `src/core/`
  - `createImdMap.ts` is the main public factory and the central runtime control path
  - `resolver.ts` contains the dataset-era rules and tile naming contract; keep this logic in the library, not consuming apps
  - `state.ts` builds the map state snapshot
- `src/map/`
  - `sources.ts` manages vector/GeoJSON sources
  - `layers.ts` manages choropleth, patient, and lead-centre layers
  - `popups.ts` handles hover/click interactions and tooltip HTML
  - `styles.ts` holds default style tokens and style merging
  - `legend.ts` renders the in-map legend UI and overlay toggles
- `src/overlays/`
  - `localAuthority.ts` manages the LA boundary overlay
  - `healthBoundaries.ts` manages NHSER / ICB / LHB overlays
  - `leadCentre.ts` normalizes lead-centre inputs
- `src/adapters/`
  - `patientInput.ts` normalizes patient input forms into GeoJSON point features
- `src/utils/`
  - `properties.ts` provides case-insensitive and alias-based tile property lookup
  - `validation.ts` validates patient coordinates and UK bounds
  - `logging.ts` centralizes non-sensitive logging
- `src/types/public.ts`
  - source of truth for the public API surface and style/options types
- `test/unit/`
  - focused unit tests for resolver, properties, validation, patient input, styles, layers, and legend logic
- `examples/`
  - standalone static HTML smoke-test pages

## Build, test, and dev paths

- Install: `npm ci`
- Build: `npm run build`
- Watch build: `npm run dev`
- Unit tests: `npm test`
- Watch tests: `npm run test:watch`
- Coverage: `npm run test:coverage`
- Typecheck: `npm run typecheck`

CI runs `npm test` then `npm run build` on push and pull request via `.github/workflows/ci.yml`.
Publishing runs via `.github/workflows/release.yml` when a GitHub release is published; it re-runs install, test, and build, then publishes to npm with GitHub OIDC trusted publishing.

## Distribution outputs

- ESM build: `dist/index.esm.js`
- Type declarations: `dist/index.d.ts`
- UMD build: `dist/umd/rcpch-imd-map.min.js`

Build config lives in `tsup.config.ts`:

- ESM build keeps `maplibre-gl` external for bundler consumers
- UMD build bundles MapLibre and exposes global `RcpchImdMap`

## Consumer docs boundary

- `README.md` should stay focused on:
  - what the package does
  - installation
  - quick starts
  - API and style options
- `AGENTS.md` should hold:
  - architectural invariants
  - project structure and control paths
  - build/test/release workflow
  - tile/data contract details
  - integration notes useful to agents and maintainers
- `PROGRESS.md` should only track release readiness, remaining work, and integration checklist items

## Tile contract and dataset rules

### Choropleth tables

Three UK mixed-nation tile tables exist per era, one per zoom tier:

| Era | Tier | Full table | Source-layer name |
| --- | --- | --- | --- |
| `2011` | `z0_4` | `public.uk_master_2011_z0_4` | `uk_master_2011_z0_4` |
| `2011` | `z5_7` | `public.uk_master_2011_z5_7` | `uk_master_2011_z5_7` |
| `2011` | `z8_10` | `public.uk_master_2011_z8_10` | `uk_master_2011_z8_10` |
| `2021` | `z0_4` | `public.uk_master_2021_z0_4` | `uk_master_2021_z0_4` |
| `2021` | `z5_7` | `public.uk_master_2021_z5_7` | `uk_master_2021_z5_7` |
| `2021` | `z8_10` | `public.uk_master_2021_z8_10` | `uk_master_2021_z8_10` |

Tile URL format:

- `{tilesBaseUrl}/public.uk_master_<era>_<tier>/{z}/{x}/{y}.pbf`

### Era semantics

- Era key means boundary year, not publication year
- Default requested era is `2021`
- England supports both:
  - `2021` = 2021 LSOA boundaries + 2025 IMD
  - `2011` = 2011 LSOA boundaries + 2019 IMD
- Wales, Scotland, and Northern Ireland are fixed to `2011` in the current tile infrastructure
- All-UK view always uses effective era `2011` so all nations render from `uk_master_2011_*`

The era resolution rules are implemented in `src/core/resolver.ts` and should remain centralized there.

### Nation filtering

- All nations share the same `uk_master_*` tables
- Nation selection is a MapLibre layer filter on the `nation` property
- There are no separate per-nation choropleth tables in this package

### Zoom tiers

- `z0_4` renders at zoom `0-5`
- `z5_7` renders at zoom `5-8`
- `z8_10` renders at zoom `8-24`

All three sources are added together; layer `minzoom`/`maxzoom` control switching.

### Overlay views

Current overlay tile views are:

- Local authority: `public.la_tiles`
- NHS England regions: `public.nhser_tiles_2021`
- ICBs: `public.icb_tiles_2023`
- Local health boards: `public.lhb_tiles_2022`

Use these exact schema-qualified source-layer names when adding MapLibre vector overlay layers.

### Canonical choropleth properties

The package expects these canonical `uk_master_*` properties:

- `code`
- `area_name`
- `imd_decile`
- `imd_year`
- `nation`
- `year`
- `la_code`, `la_name`, `la_year`
- `nhser_code`, `nhser_name`
- `icb_code`, `icb_name`
- `lhb_code`, `lhb_name`

Older casing variants and legacy names are resolved via `src/utils/properties.ts`.

## Public API facts worth preserving

- `createImdMap()` is the only public factory
- `fitToData()` fits to patients + lead centre with optional padding
- `setPatients(data, { strict: true })` throws on first invalid record
- `setOverlayVisibility()` is the public boundary overlay toggle surface
- Legend behavior is configurable via create options and `style.legend`

## Testing map behavior

Current unit tests live under `test/unit/`:

- `resolver.test.ts` validates era rules, tile naming, and nation filters
- `properties.test.ts` validates canonical and alias lookup
- `validation.test.ts` validates coordinate handling and UK bounds
- `patientInput.test.ts` validates patient normalization and strict mode
- `styles.test.ts` validates color ramp generation and style precedence
- `layers.test.ts` validates patient group color expression generation
- `legend.test.ts` validates legend row visibility and nation-specific enabled/disabled behavior

These tests run in Node only; there is currently no browser integration test suite in-repo.

## NPDA integration path

NPDA has been the real integration target during development.
The current intended path is:

1. Build UMD bundle in this repo
2. Copy `dist/umd/rcpch-imd-map.min.js` into NPDA static assets
3. Pass plain patient + lead-centre payloads from Django
4. Initialize the map client-side in the template or a shared JS file
5. Expose `RCPCH_DEPRIVATION_TILES_URL` in the page context
6. Destroy existing map instances on HTMX swap before replacing the DOM

If integration behavior disagrees with README examples, trust the live NPDA-validated path and update docs.

## Release path

Before publishing:

1. Run `npm run typecheck`
2. Run `npm test`
3. Run `npm run build`
4. Run `npm pack --json` and inspect tarball contents, `shasum`, and npm `integrity`
5. Run `npm run release:checksums` to generate `release-checksums.json` for the tarball and built bundles
6. Confirm `CHANGELOG.md` and package version are aligned
7. Confirm npm package ownership/reservation
8. Tag release and publish
9. Verify jsDelivr CDN URL for the published UMD bundle

## Editing guidance for future agents

- Prefer fixing behavior in the owning abstraction:
  - era/tile selection in `resolver.ts`
  - public runtime control in `createImdMap.ts`
  - tile property compatibility in `properties.ts`
  - map styling defaults in `styles.ts`
  - layer paint/layout behavior in `layers.ts`
- Do not move domain rules into examples or consuming apps
- Keep README examples concise and consumer-facing
- Keep AGENTS accurate whenever tile contracts, overlay view names, test locations, or release steps change
