# @rcpch/imd-map

A browser-first UK deprivation map library. Renders IMD choropleth tiles using [MapLibre GL JS](https://maplibre.org) with optional patient scatter and lead-centre overlays.

Authored in TypeScript. Consuming applications only need plain JavaScript.

Maintainers and coding agents: see `AGENTS.md` for project structure, test locations, tile contracts, and release workflow.

Upstream tile/data source: [`rcpch/rcpch-census-platform`](https://github.com/rcpch/rcpch-census-platform)

Live demo: [rcpch.github.io/rcpch-census-platform/](https://rcpch.github.io/rcpch-census-platform/)

Release integrity: run `npm pack --json` for npm `shasum` / `integrity`, or `npm run release:checksums` after packing to generate `release-checksums.json` with SHA hashes for the tarball and built bundles.

## CI and release automation

- Pushes to `main` and all pull requests run automated validation via `.github/workflows/ci.yml`:
  - `npm ci`
  - `npm test`
  - `npm run build`
- Publishing is handled by `.github/workflows/release.yml` when a GitHub release is published:
  - `npm ci`
  - `npm test`
  - `npm run build`
  - `npm publish --provenance --access public`

For npm publish to succeed, configure npm Trusted Publishing for this GitHub repository/package pair.

---

## What problem does this solve?

Standard server-side mapping tools (Plotly, Folium) render finished map HTML on the server. For a vector tile choropleth—where the browser streams tiles from a tile server and renders them using WebGL—this is the wrong boundary. This library moves all map internals to the browser and lets the backend focus on preparing plain data.

---

## Quick start — npm + bundler

```bash
npm install @rcpch/imd-map
# maplibre-gl is a peer dependency
npm install maplibre-gl
```

```js
import 'maplibre-gl/dist/maplibre-gl.css';
import { createImdMap } from '@rcpch/imd-map';

const map = createImdMap({
  container: 'map',
  tilesBaseUrl: 'https://your-tile-server.example.com',
  initialNation: 'all',
});

map.setPatients([
  { id: 'p1', lat: 51.5074, lon: -0.1278 },
  { id: 'p2', lat: 53.4808, lon: -2.2426 },
]);

map.setLeadCentre({ lat: 51.5202, lon: -0.1049, label: 'Lead Centre' });
```

---

## Quick start — static HTML (CDN)

The UMD bundle includes MapLibre GL. No separate script tag required.

```html
<div id="map" style="height: 600px"></div>

<script src="https://cdn.jsdelivr.net/npm/@rcpch/imd-map@0.1.0/dist/umd/rcpch-imd-map.min.js"></script>
<script>
  const map = RcpchImdMap.createImdMap({
    container: 'map',
    tilesBaseUrl: 'https://your-tile-server.example.com',
    initialNation: 'all',
    style: {
      tooltip: { areaLabel: 'Area', decileLabel: 'IMD decile' },
    },
  });
</script>
```

If you need release-grade checksum verification for the published bundle or packed tarball, generate hashes locally with `npm pack --json` and `npm run release:checksums` before publishing.

---

## Quick start — Django / HTMX template

The backend prepares plain data. The template embeds it with `json_script`. A small script initializes the map.

**Django view:**

```python
context = {
    "map_payload": {
        "patients": [
            {"id": "p1", "lat": 51.5074, "lon": -0.1278},
            {"id": "p2", "lat": 53.4808, "lon": -2.2426},
        ],
        "leadCentre": {"lat": 51.5202, "lon": -0.1049, "label": "Lead Centre"},
        "style": {
            "decileColors": ["#7a0036","#a3004b","#c92e6f","#de5f92","#eba0ba",
                             "#f3bfd0","#f8d7e2","#fce8ef","#fff0f6","#fff5f8"],
            "boundaryColor": "#0d0d58",
        },
    }
}
```

**Django template (partial):**

```html
{% load static %}

{% if error %}
  <div class="alert alert-danger">{{ error }}</div>
{% elif info %}
  <div class="alert alert-info">{{ info }}</div>
{% else %}
  <div id="organisation-cases-map" style="width:100%;height:32rem;"></div>
  {{ map_payload|json_script:"organisation-cases-map-payload" }}
{% endif %}

<script src="{% static 'vendor/rcpch-imd-map.min.js' %}"></script>
<script>
  (function () {
    var el = document.getElementById('organisation-cases-map');
    if (!el) return;

    // Destroy any previous instance to prevent leaks on HTMX swaps
    if (window._npdaMapInstance) {
      window._npdaMapInstance.destroy();
      window._npdaMapInstance = null;
    }

    var payload = JSON.parse(
      document.getElementById('organisation-cases-map-payload').textContent
    );

    // Django-safe literal tokens for the map library's tooltip interpolation
    var token = {
      patientLabel: '{% templatetag openvariable %}patientLabel{% templatetag closevariable %}',
      id: '{% templatetag openvariable %}id{% templatetag closevariable %}',
      leadCentreLabel: '{% templatetag openvariable %}leadCentreLabel{% templatetag closevariable %}',
      label: '{% templatetag openvariable %}label{% templatetag closevariable %}'
    };

    var map = RcpchImdMap.createImdMap({
      container: 'organisation-cases-map',
      tilesBaseUrl: window.RCPCH_DEPRIVATION_TILES_URL,
      initialNation: 'all',
      style: {
        choropleth: { fallbackDecileColors: payload.style.decileColors },
        boundaries: { localAuthorityColor: payload.style.boundaryColor },
        tooltip: {
          areaLabel: 'Local area',
          patientLabel: 'Child',
          patientTooltipText: token.patientLabel + ': ' + token.id,
          leadCentreTooltipText: token.leadCentreLabel + ': ' + token.label,
          backgroundColor: '#0d0d58',
          textColor: '#ffffff',
        },
      },
      onWarning: function (w) {
        console.warn('[rcpch-imd-map]', w.code, w.message);
      },
    });

    map.setPatients(payload.patients);
    map.setLeadCentre(payload.leadCentre);

    window._npdaMapInstance = map;
  })();
</script>
```

**Copy the built UMD bundle into your Django static directory:**

```bash
# From the library repo (after npm run build)
cp dist/umd/rcpch-imd-map.min.js /path/to/npda/project/static/vendor/
```

Set `window.RCPCH_DEPRIVATION_TILES_URL` before the script runs, for example in your base template:

```html
<script>window.RCPCH_DEPRIVATION_TILES_URL = "{{ TILES_BASE_URL }}";</script>
```

---

## Runtime tile configuration

Tile URL resolution precedence:

1. `tilesBaseUrl` option passed to `createImdMap`.
2. `window.RCPCH_DEPRIVATION_TILES_URL` global (for static/script-tag use).
3. Nothing — a warning is logged and choropleth tiles will not load.

The library source contains **no hardcoded tile URLs**.

---

## Nation and era rules

| Nation | Requested era | Effective era |
|---|---|---|
| `all` | any | always `2011` |
| `england` | `2011` or `2021` | as requested |
| `wales` | any | always `2011` |
| `scotland` | any | always `2011` |
| `northern_ireland` | any | always `2011` |

When the effective era differs from the requested era, `onWarning` is called with code `ERA_OVERRIDE`.

---

## Styling

All style options are optional and merge on top of built-in RCPCH defaults.

```js
createImdMap({
  container: 'map',
  tilesBaseUrl: '...',
  style: {
    choropleth: {
      // Auto-generate a 10-step ramp from one base color per nation
      baseColorByNation: {
        england: '#d7191c',
        wales: '#1a9641',
        scotland: '#2b83ba',
        northern_ireland: '#7f7f7f',
      },
      // 10 hex colors, index 0 = decile 1 (most deprived)
      fallbackDecileColors: ['#7a0036', ...],
      fillOpacity: 0.7,
      borderColor: '#ffffff',
      borderWidth: 0.5,
    },
    boundaries: {
      localAuthorityColor: '#0d0d58',
      icbColor: '#3d3d3d',
      localAuthorityWidth: 1,
    },
    patients: {
      circleColor: '#0d0d58',
      circleRadius: 5,
      circleOpacity: 0.8,
    },
    leadCentre: {
      color: '#e00087',
      radius: 10,
    },
    legend: {
      backgroundColor: '#ffffff',
      textColor: '#0d0d58',
      borderColor: '#d8dde6',
      borderRadius: 8,
      width: 220,
      toggleOnColor: '#0d0d58',
      toggleOffColor: '#6b7280',
    },
    tooltip: {
      backgroundColor: '#0d0d58',
      textColor: '#ffffff',
      areaLabel: 'Area',
      decileLabel: 'IMD decile',
      nationLabel: 'Nation',
      patientLabel: 'Patient',
      leadCentreLabel: 'Lead centre',
      patientTooltipText: '{{patientLabel}}',
      leadCentreTooltipText: '{{leadCentreLabel}}: {{label}}',
    },
  },
});
```

### Tooltip templates

`patientTooltipText` and `leadCentreTooltipText` support `{{token}}` interpolation.

If you are writing inline JavaScript inside a Django template, Django will try to
evaluate `{{...}}` first. Use one of these patterns so the map library still
receives literal tokens:

1. Use `{% templatetag openvariable %}` and `{% templatetag closevariable %}`
  to emit literal `{{` and `}}` (shown in the Django example above).
2. Wrap only the relevant JavaScript block in `{% verbatim %}...{% endverbatim %}`
  when you do not need Django variable interpolation inside that block.
3. Build the token string server-side (for example in your view context) and pass
  it in your JSON payload.

**Patient tokens** (`patientTooltipText`):

| Token | Value |
|---|---|
| `{{patientLabel}}` | The `patientLabel` style option (default `"Patient"`) |
| `{{id}}` | The `id` field from `setPatients([{ id, lat, lon }])` |
| `{{group}}` | The `group` field from `setPatients([{ id, lat, lon, group }])` |

Examples:

```js
// Show the patient id
patientTooltipText: 'Patient ID: {{id}}'

// Show a custom label with id
patientTooltipText: '{{patientLabel}} — ref: {{id}}'

// Show group
patientTooltipText: 'Group: {{group}}'
```

**Lead-centre tokens** (`leadCentreTooltipText`):

| Token | Value |
|---|---|
| `{{leadCentreLabel}}` | The `leadCentreLabel` style option (default `"Lead centre"`) |
| `{{label}}` | The `label` field from `setLeadCentre({ label, lat, lon })` |

Style can also be updated at runtime:

```js
map.setStyle({ tooltip: { areaLabel: 'Local area' } });
```

---

## API reference

### `createImdMap(options)` → `ImdMapInstance`

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `string \| HTMLElement` | — | DOM element ID or element reference |
| `tilesBaseUrl` | `string` | — | Base URL of the tile server |
| `initialNation` | `Nation` | `'all'` | Starting nation filter |
| `initialEra` | `Era` | `'2021'` | Requested era (may be overridden) |
| `enableLocalAuthorityOverlay` | `boolean` | `false` | Show local authority boundary overlay at startup |
| `enableHealthOverlays` | `boolean` | `false` | Show NHSER, ICB, and LHB boundary overlays at startup |
| `showLegend` | `boolean` | `true` | Show the collapsible legend control |
| `legendPosition` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'top-right'` | Legend control position inside map container |
| `legendCollapsed` | `boolean` | `false` | Start with legend content collapsed |
| `legendTitle` | `string` | `'Map layers'` | Legend header title text |
| `showLegendLocalAuthority` | `boolean` | `true` | Show/hide local authority legend toggle row |
| `showLegendNhser` | `boolean` | `true` | Show/hide NHS England regions legend toggle row |
| `showLegendIcb` | `boolean` | `true` | Show/hide ICB legend toggle row |
| `showLegendLhb` | `boolean` | `true` | Show/hide local health boards legend toggle row |
| `mapStyleUrl` | `string` | Carto Positron | MapLibre base style URL |
| `center` | `[lon, lat]` | UK center | Initial map center |
| `zoom` | `number` | `5` | Initial zoom level |
| `style` | `MapStyleOptions` | RCPCH defaults | Visual style overrides |
| `onViewChange` | `function` | — | Called when nation or era changes |
| `onAreaHover` | `function` | — | Called on choropleth feature hover |
| `onAreaClick` | `function` | — | Called on choropleth feature click |
| `onWarning` | `function` | — | Called for non-fatal issues |

### Instance methods

| Method | Description |
|---|---|
| `setView({ nation?, era? })` | Update nation and/or era |
| `setNation(nation)` | Change the nation filter |
| `setEra(era)` | Change the requested era |
| `setStyle(style)` | Update visual style at runtime |
| `setOverlayVisibility({...})` | Show/hide boundary overlays (`localAuthority`, `nhser`, `icb`, `lhb`) |
| `setPatients(data, options?)` | Set patient scatter data |
| `clearPatients()` | Remove patient overlay |
| `setLeadCentre(data, options?)` | Set lead-centre marker |
| `clearLeadCentre()` | Remove lead-centre marker |
| `getState()` | Return current map state snapshot |
| `resize()` | Trigger MapLibre resize (use after container resize) |
| `fitToData(options?)` | Fit to lead centre and/or patient points. Uses bounds with default 50px padding for multi-point data; single-point fallback uses zoom 6 unless overridden. |
| `destroy()` | Remove all layers, sources, listeners, and map instance |

Legend notes:

- The legend is collapsible and includes clickable rows to toggle overlays.
- A compact key is shown below toggles with boundary line swatches and an IMD decile color ramp.
- Rows can be hidden per overlay type using `showLegendLocalAuthority`, `showLegendNhser`, `showLegendIcb`, and `showLegendLhb`.
- Nation-specific rows stay visible but are disabled when not applicable (for example, `England only` or `Wales only`).

---

## HTMX / partial swap cleanup

When a map container is replaced by an HTMX swap, call `destroy()` first to prevent memory leaks:

```js
document.addEventListener('htmx:beforeSwap', function (e) {
  if (window._npdaMapInstance && e.detail.target.contains(document.getElementById('organisation-cases-map'))) {
    window._npdaMapInstance.destroy();
    window._npdaMapInstance = null;
  }
});
```

---

## Patient data format

Accepted as:

- Array of plain objects: `[{ id, lat, lon, group?, ...extraProps }]`
- GeoJSON `FeatureCollection<Point>`
- Array of GeoJSON `Feature<Point>`

Invalid records are skipped and surfaced via `onWarning`. Pass `{ strict: true }` as the second argument to `setPatients` to throw on the first invalid record instead.

---

## License

MIT
