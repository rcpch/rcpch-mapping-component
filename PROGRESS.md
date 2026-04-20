# @rcpch/imd-map — Project Progress

This document records the decisions made, work completed, and what remains to be done before v0.1.0 is ready for wider consumption.

---

## Decisions Made

### Library architecture

- TypeScript source, JS-consumable outputs. Consumers never need TypeScript tooling.
- **tsup** dual build: ESM bundle (`dist/index.esm.js`, maplibre-gl external peer) + IIFE/UMD bundle (`dist/umd/rcpch-imd-map.min.js`, maplibre-gl bundled for script-tag/Django use).
- **MapLibre GL JS** (`>=3.6.0 <6`) as the rendering engine.
- **Vitest** for unit tests in a Node environment (no browser required for unit layer).

### Tile server contract

- Backend: **pg_tileserv** serving PostGIS tables.
- URL pattern: `{tilesBaseUrl}/public.{tableName}/{z}/{x}/{y}.pbf`
- Source-layer name in PBF = table name without the `public.` prefix.

### Tile table naming (real schema from rcpch-census-platform)

Three tables per era, one per zoom tier, all nations in the same table:

| Era key | Zoom tier | Full table name | Source-layer name |
|---------|-----------|-----------------|-------------------|
| `2011`  | `z0_4`    | `public.uk_master_2011_z0_4`  | `uk_master_2011_z0_4`  |
| `2011`  | `z5_7`    | `public.uk_master_2011_z5_7`  | `uk_master_2011_z5_7`  |
| `2011`  | `z8_10`   | `public.uk_master_2011_z8_10` | `uk_master_2011_z8_10` |
| `2021`  | `z0_4`    | `public.uk_master_2021_z0_4`  | `uk_master_2021_z0_4`  |
| `2021`  | `z5_7`    | `public.uk_master_2021_z5_7`  | `uk_master_2021_z5_7`  |
| `2021`  | `z8_10`   | `public.uk_master_2021_z8_10` | `uk_master_2021_z8_10` |

### Era key semantics

The era key is the **boundary year**, not the index publication year.

| Era key | England | Wales | Scotland | N. Ireland |
|---------|---------|-------|----------|------------|
| `'2021'` **(default)** | 2025 IMD / 2021 LSOAs | — | — | — |
| `'2011'` | 2019 IMD / 2011 LSOAs | 2019 WIMD / 2011 LSOAs | 2020 SIMD / 2011 DataZones | 2017 NIMDM / 2001 SOAs |

### Era resolution rules

Encoded in `src/core/resolver.ts`. Must not be moved into consuming applications.

| Nation | Requested era | Effective era used for tiles |
|--------|---------------|------------------------------|
| `all`  | any | Always `2011` (so all 4 nations appear via `uk_master_2011_*`) |
| `england` | `2011` or `2021` | Honoured as requested (default `2021`) |
| `wales` | any | Always `2011` |
| `scotland` | any | Always `2011` |
| `northern_ireland` | any | Always `2011` |

### Nation filtering

All nations share the same tile tables. Filtering is done at the MapLibre layer level via a filter expression on the `nation` column:
```js
['==', ['get', 'nation'], 'england']   // or null for 'all'
```
There are no separate per-nation tile tables.

### Zoom-tiered source model

Three MapLibre vector sources are added simultaneously, one per zoom tier. Each choropleth fill/line layer pair has `minzoom`/`maxzoom` so MapLibre switches automatically:

| Tier    | minzoom | maxzoom |
|---------|---------|---------|
| `z0_4`  | 0       | 5       |
| `z5_7`  | 5       | 8       |
| `z8_10` | 8       | 24      |

### Canonical tile property names (`uk_master_*`)

- `code` — area code (LSOA/DataZone/SOA)
- `area_name` — area name
- `imd_decile`, `imd_year`, `nation`, `year`
- `la_code`, `la_name`, `la_year`
- `nhser_code`, `nhser_name`, `icb_code`, `icb_name`, `lhb_code`, `lhb_name`

Old casing variants and legacy names (`LSOA11CD`, `lsoa_name`, etc.) are supported via alias lookup in `src/utils/properties.ts`.

### Default initialisation values

- `initialNation`: `'all'`
- `initialEra`: `'2021'` (England 2025 IMD on 2021 LSOAs — matches live census platform)

### Patient validation

Out-of-bounds points are always skipped (never plotted). In non-strict mode a warning is emitted via `onWarning`. The `strict` parameter has been removed from the public API.

---

## Work Completed

### Build and tooling ✅

- `package.json` — scoped package `@rcpch/imd-map`, dual ESM + IIFE exports, maplibre-gl peer dep
- `tsup.config.ts` — ESM (maplibre external) + IIFE (maplibre bundled, globalName `RcpchImdMap`)
- `vitest.config.ts` — Node environment, unit tests only
- `tsconfig.json` — strict TypeScript
- Build produces `dist/index.esm.js`, `dist/umd/rcpch-imd-map.min.js`, `dist/index.d.ts`

### Source files ✅

- `src/types/public.ts` — all public TypeScript types
- `src/utils/logging.ts` — internal logger, never logs raw patient data
- `src/utils/properties.ts` — case-insensitive property lookup with alias resolution
- `src/utils/validation.ts` — lat/lon validation, UK bounds check, patient point normalisation
- `src/core/resolver.ts` — era resolution, zoom-tier constants, table name builder, tile URL builder, nation filter expression helper
- `src/core/state.ts` — initial state factory
- `src/core/createImdMap.ts` — main factory, full public API, HTMX-safe instance management
- `src/map/sources.ts` — 3-tier zoom sources, patient + lead-centre GeoJSON sources
- `src/map/layers.ts` — 3-tier fill/line layers with nation filter, patient + lead-centre circle layers
- `src/map/popups.ts` — tooltip builder (`area_name`, `imd_decile`, `nation`), hover/click handlers across all fill layers
- `src/map/styles.ts` — RCPCH colour ramps per nation, `mergeStyle()`, `getDecileColors()`
- `src/adapters/patientInput.ts` — normalise PatientInput to GeoJSON features
- `src/overlays/leadCentre.ts` — normalise LeadCentreInput to GeoJSON feature
- `src/index.ts` — public entry point

### Tests ✅ — 65/65 passing

- `test/unit/resolver.test.ts` — era resolution, table names, tile URL, nation filter expressions
- `test/unit/properties.test.ts` — canonical keys, alias resolution, case-insensitive fallback
- `test/unit/validation.test.ts` — lat/lon validation, UK bounds, patient normalisation
- `test/unit/patientInput.test.ts` — array normalisation, GeoJSON FeatureCollection, invalid records
- `test/unit/styles.test.ts` — decile ramp generation, per-nation base colors, explicit ramp override
- `test/unit/styles.test.ts` — decile ramp generation, per-nation base colors, explicit ramp override

### Documentation and examples ✅

- `README.md` — npm quickstart, CDN quickstart, Django/HTMX template example, API reference
- `CHANGELOG.md` — initial 0.1.0 entry
- `examples/standalone.html` — static HTML + UMD bundle
- `examples/standalone-with-patients.html` — static HTML + patient overlay

---

## What Remains

### Immediately before local integration test ✅

- [x] ~~Confirm tsup IIFE output filename~~ — fixed: `outExtension: () => ({ js: '.js' })` in `tsup.config.ts`. Output is now `dist/umd/rcpch-imd-map.min.js` directly.
- [x] **Per-nation color rendering in all-UK mode** — `buildColorExpression()` returns `match` on `nation` property, so England/Wales/Scotland/NI each render in their own color family
- [x] **Arbitrary extra property tokens in tooltips** — all feature properties (e.g. `nhs_number`) available as `{{tokenName}}` in `patientTooltipText` template
- [x] **fitToData() working correctly** — centers on lead centre, zoom to configurable level (default 6), properly queued before map load, deferred to idle event

### Phase 2 — Overlays (stubs only, not yet implemented)

- [ ] `src/overlays/localAuthority.ts` — LA boundary tile source + layer
- [ ] `src/overlays/healthBoundaries.ts` — NHSER / ICB / LHB boundary sources + layers
- [ ] `setOverlayVisibility()` in `createImdMap.ts` — currently a no-op stub

### Phase 3 — Patient layer enhancements

- [ ] Group colour mapping via `PatientStyleOptions.colorByGroup`
- [ ] Clustering / heatmap mode

### Phase 4 — Packaging and release

- [ ] Reserve npm package name `@rcpch/imd-map`
- [ ] Add `LICENSE` file (Apache 2.0 or MIT — confirm)
- [ ] Run `npm pack` and inspect tarball before publishing
- [ ] Tag `v0.1.0` and run `npm publish --access public`
- [ ] Verify CDN URL: `https://cdn.jsdelivr.net/npm/@rcpch/imd-map@0.1.0/dist/umd/rcpch-imd-map.min.js`

---

## Local Integration Test — NPDA

The library must be proved working inside NPDA before wider publication.
This replaces the current Plotly server-rendered map with a browser-side MapLibre choropleth.

### Step 1 — Build the UMD bundle

```bash
# In this repo (rcpch-mapping-component)
npm run build
```

This produces `dist/umd/rcpch-imd-map.min.js` (maplibre-gl bundled, ~793 KB).

### Step 2 — Copy bundle into NPDA static directory

```bash
cp dist/umd/rcpch-imd-map.min.js \
   /path/to/npda/npda/static/vendor/rcpch-imd-map.min.js
```

Alternatively, use a `file:` dependency in `package.json` if NPDA has a JS build step, but a simple static copy is fine for the initial smoke test.

### Step 3 — Update the Django view

Remove Plotly figure construction. Prepare plain data for the template:

```python
# views.py — the map section
context["map_payload"] = {
    "patients": [
        {
            "id": str(patient.pk),
            "lat": float(patient.latitude),
            "lon": float(patient.longitude),
        }
        for patient in patients
        if patient.latitude and patient.longitude
    ],
    "leadCentre": {
        "lat": float(organisation.latitude),
        "lon": float(organisation.longitude),
        "label": organisation.name,
    },
}
```

### Step 4 — Update the Django template partial

Replace the Plotly output block with:

```html
{% load static %}

{% if error %}
  <div class="alert alert-danger">{{ error }}</div>
{% elif info %}
  <div class="alert alert-info">{{ info }}</div>
{% else %}
  <link rel="stylesheet"
        href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />

  <div id="organisation-cases-map"
       style="width:100%;height:32rem;border-radius:4px;"></div>

  {{ map_payload|json_script:"organisation-cases-map-payload" }}
{% endif %}
```

### Step 5 — Add the initialisation script

At the bottom of the template (or in a dedicated static file `map-init.js`):

```html
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="{% static 'vendor/rcpch-imd-map.min.js' %}"></script>
<script>
  (function () {
    var container = document.getElementById('organisation-cases-map');
    if (!container) return;

    // Destroy any previous instance to prevent GL context leaks on HTMX swaps.
    if (window.__npdaMap) {
      window.__npdaMap.destroy();
      window.__npdaMap = null;
    }

    var payload = JSON.parse(
      document.getElementById('organisation-cases-map-payload').textContent
    );

    // Ensure tilesBaseUrl is set (Step 6) before creating the map
    if (!window.RCPCH_DEPRIVATION_TILES_URL) {
      console.error('RCPCH_DEPRIVATION_TILES_URL not set. Check Step 6 — tile server URL must be exposed.');
      return;
    }

    window.__npdaMap = RcpchImdMap.createImdMap({
      container: container,
      tilesBaseUrl: window.RCPCH_DEPRIVATION_TILES_URL,
      // initialEra defaults to '2021' (England 2025 IMD / 2021 LSOAs)
      initialNation: 'all',
    });

    window.__npdaMap.setPatients(payload.patients);
    window.__npdaMap.setLeadCentre(payload.leadCentre);
    
    // Fit map to show all patients + lead centre with 50px padding
    window.__npdaMap.fitToData({ padding: 50 });
  })();
</script>
```

### Step 6 — Expose the tile server URL

In the NPDA base template or a settings context processor, expose the tile URL as a global variable:

```html
<!-- Option A — from direct context variable (if passed in view) -->
<script>
  window.RCPCH_DEPRIVATION_TILES_URL = "{{ RCPCH_DEPRIVATION_TILES_URL }}";
</script>

<!-- Option B — from Django settings (if stored in settings.py) -->
<script>
  window.RCPCH_DEPRIVATION_TILES_URL = "{{ settings.RCPCH_DEPRIVATION_TILES_URL }}";
</script>
```

Choose **Option A** if your view passes `RCPCH_DEPRIVATION_TILES_URL` directly in the context (without `settings.` namespace). Choose **Option B** if you pull it from Django settings.

The URL should point to the running census-platform tile server (e.g. `https://api.rcpch.ac.uk/deprivation/v2/tiles`).

### Step 7 — HTMX cleanup hook

If the map partial is loaded inside an HTMX-swapped region, destroy the map before the container is replaced:

```html
<!-- On the element whose innerHTML HTMX replaces -->
<div id="map-partial-wrapper"
     hx-on::before-swap="if(window.__npdaMap){window.__npdaMap.destroy();window.__npdaMap=null;}">
  ...
</div>
```

Or add a document-level listener once in a shared JS file:

```js
document.addEventListener('htmx:beforeSwap', function (evt) {
  if (evt.detail.target.id === 'map-partial-wrapper' && window.__npdaMap) {
    window.__npdaMap.destroy();
    window.__npdaMap = null;
  }
});
```

## Pre-publish Checklist

- [x] NPDA Step 8 verification checklist passed on a real NPDA environment
- [ ] `examples/standalone.html` loads correctly from a local file server (`npx serve examples/`)
- [ ] `examples/standalone-with-patients.html` plots patient points correctly
- [ ] `npm pack` tarball contains only `dist/`, `README.md`, `CHANGELOG.md`, `package.json`
- [ ] Package name `@rcpch/imd-map` reserved on npmjs.com
- [ ] `LICENSE` file present
- [ ] CHANGELOG entry for `0.1.0` is accurate and dated
- [ ] GitHub Actions CI: `npm test` + `npm run build` pass on a clean checkout
