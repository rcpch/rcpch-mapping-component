import type { Nation, Era } from '../types/public';

// ── Era resolution ────────────────────────────────────────────────────────────
//
// These rules encode the core domain constraints from the spec.
// They must not be moved to consuming applications.
//
// Source of truth: rcpch-census-platform AGENTS.md "Dataset/Boundary Source Of Truth"
//
// Era key meanings (from live census platform):
//   '2021' era → England 2025 IMD on 2021 LSOAs  (default for England)
//   '2011' era → England 2019 IMD on 2011 LSOAs
//   Wales       → always 2019 WIMD on 2011 LSOAs (no 2025 WIMD published)
//   Scotland    → always 2020 SIMD on 2011 DataZones
//   N. Ireland  → always 2017 NIMDM on 2001 SOAs
//
// Rules:
//   all-UK view       → consumer-requested era (default 2021)
//                       2021 uses mixed-vintage UK tiles: England 2021 LSOAs + 2025 IMD,
//                       with Wales / Scotland / N. Ireland remaining on their current data
//   england only      → consumer-requested era (2011 or 2021, default 2021)
//   wales / scotland  → fixed to 2011 era in current tile infrastructure
//   northern ireland  → fixed to 2011 era in current tile infrastructure

/**
 * Resolve the effective era that will actually be used for tile fetching.
 * The consumer may request an era that is not supported for a given nation.
 */
export function resolveEffectiveEra(nation: Nation, requestedEra: Era): Era {
  switch (nation) {
    case 'all':
      return requestedEra;
    case 'england':
      return requestedEra;
    case 'wales':
    case 'scotland':
    case 'northern_ireland':
      return '2011';
    default:
      return '2011';
  }
}

/**
 * Returns true when the effective era will differ from the requested era.
 * Use this to decide whether to emit an onWarning callback.
 */
export function willEraBeOverridden(nation: Nation, requestedEra: Era): boolean {
  return resolveEffectiveEra(nation, requestedEra) !== requestedEra;
}

// ── Zoom tier resolution ──────────────────────────────────────────────────────
//
// The census platform materializes four tile tables per era, each pre-built for
// a zoom range with appropriate geometry simplification.
//
//   z0_4   → zoom 0–4   (whole UK fits on screen)
//   z5_7   → zoom 5–7   (region/county level)
//   z8_10  → zoom 8–10  (individual area level)
//   z11_14 → zoom 11–14 (detailed area level)
//
// In MapLibre GL, all sources are added simultaneously. Each corresponding
// fill layer is given a minzoom / maxzoom so MapLibre switches them automatically
// as the user zooms. Only the correct tier is rendered at any given zoom level.

export type ZoomTier = 'z0_4' | 'z5_7' | 'z8_10' | 'z11_14';

export const ZOOM_TIERS: { tier: ZoomTier; minzoom: number; maxzoom: number }[] = [
  { tier: 'z0_4',  minzoom: 0, maxzoom: 5 },
  { tier: 'z5_7',  minzoom: 5, maxzoom: 8 },
  { tier: 'z8_10', minzoom: 8, maxzoom: 11 },
  { tier: 'z11_14', minzoom: 11, maxzoom: 24 },
];

// ── Table name resolution ─────────────────────────────────────────────────────
//
// The tile server (pg_tileserv) exposes tables in the format:
//   public.uk_master_{era}_{zoom_tier}
//
// The URL template for MapLibre is:
//   {tilesBaseUrl}/public.uk_master_{era}_{zoom_tier}/{z}/{x}/{y}.pbf
//
// The source-layer name inside the PBF file is the table name WITHOUT the schema
// prefix, i.e. `uk_master_2011_z0_4` (pg_tileserv default behavior).
//
// Nation filtering is done via a MapLibre filter expression on the `nation`
// property column — all nations are stored in the same `uk_master_*` tables.

/**
 * Resolve the pg_tileserv table name for a given effective era and zoom tier.
 * Returns the bare table name (without schema prefix).
 * Used as the `source-layer` value in MapLibre layer definitions.
 */
export function resolveTileTableName(effectiveEra: Era, tier: ZoomTier): string {
  return `uk_master_${effectiveEra}_${tier}`;
}

/**
 * Build the full pg_tileserv table identifier including schema prefix.
 * Used in tile URL construction.
 */
export function resolveFullTableName(effectiveEra: Era, tier: ZoomTier): string {
  return `public.uk_master_${effectiveEra}_${tier}`;
}

/**
 * Build a MapLibre-compatible tile URL template for a given table.
 * pg_tileserv format: {base}/public.{tableName}/{z}/{x}/{y}.pbf
 */
export function buildTileUrl(tilesBaseUrl: string, fullTableName: string): string {
  const base = tilesBaseUrl.replace(/\/$/, '');
  return `${base}/${fullTableName}/{z}/{x}/{y}.pbf`;
}

// ── Nation filter expressions ─────────────────────────────────────────────────
//
// The `nation` column in uk_master_* tiles holds lowercase string values.
// When a specific nation is selected, apply a MapLibre filter expression to
// restrict rendered features. For 'all', no filter is applied.

export type NationFilterValue = 'england' | 'wales' | 'scotland' | 'northern_ireland' | null;

/**
 * Return a MapLibre filter expression to restrict tiles to a single nation,
 * or null when all nations should be shown.
 */
export function resolveNationFilter(nation: Nation): unknown[] | null {
  if (nation === 'all') return null;
  return ['==', ['get', 'nation'], nation];
}
