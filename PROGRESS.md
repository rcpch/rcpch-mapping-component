# @rcpch/imd-map — Release Progress

This file tracks release readiness and integration status for `v0.1.0`.

For project structure, test locations, tile contracts, and agent-oriented implementation notes, see `AGENTS.md`.

---

## What Remains

### Immediately before local integration test ✅

- [x] ~~Confirm tsup IIFE output filename~~ — fixed: `outExtension: () => ({ js: '.js' })` in `tsup.config.ts`. Output is now `dist/umd/rcpch-imd-map.min.js` directly.
- [x] **Per-nation color rendering in all-UK mode** — `buildColorExpression()` returns `match` on `nation` property, so England/Wales/Scotland/NI each render in their own color family
- [x] **Arbitrary extra property tokens in tooltips** — all feature properties (e.g. `nhs_number`) available as `{{tokenName}}` in `patientTooltipText` template
- [x] **fitToData() working correctly** — fits to lead centre and patient points; uses bounds + configurable padding for multi-point data, single-point fallback zoom (default 6), queued before map load and deferred to idle event

### Phase 2 — Overlays ✅

- [x] `src/overlays/localAuthority.ts` — LA boundary tile source + line layer
- [x] `src/overlays/healthBoundaries.ts` — NHSER / ICB / LHB boundary sources + line layers
- [x] `setOverlayVisibility()` in `createImdMap.ts` — toggles boundary overlays at runtime

### Phase 3 — Patient layer enhancements

- [x] Group colour mapping via `PatientStyleOptions.colorByGroup`
- [ ] Clustering / heatmap mode

### UX Enhancements ✅

- [x] Collapsible corner legend control
- [x] Clickable legend labels to toggle boundary overlays (`nhser`, `icb`, `localAuthority`, optional `lhb`)
- [x] Legend visibility options for each overlay row (show/hide unused options)
- [x] Legend style props (background, text, border, sizing, toggle colors)
- [x] Compact legend key section (boundary line swatches + IMD decile ramp)
- [x] Overlay source-layer defaults aligned with census platform views (`public.la_tiles`, `public.nhser_tiles_2021`, `public.icb_tiles_2023`, `public.lhb_tiles_2022`)

### Phase 4 — Packaging and release

- [ ] Reserve npm package name `@rcpch/imd-map`
- [x] Add `LICENSE` file (MIT)
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
- [x] `LICENSE` file present
- [ ] CHANGELOG entry for `0.1.0` is accurate and dated
- [x] GitHub Actions CI workflow added: `npm test` + `npm run build` on push/PR
