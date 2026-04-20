// Case-insensitive and alias-tolerant property lookup for vector tile features.
// Canonical property names are as exposed by pg_tileserv from the census platform.
//
// Source of truth: rcpch-census-platform AGENTS.md "Exposed tile properties"
//
// uk_master_* columns: code, area_name, imd_decile, imd_year, nation, year,
//   la_code, la_name, la_year, nhser_code, nhser_name, icb_code, icb_name,
//   lhb_code, lhb_name
// lsoa_tiles_* columns: lsoa_code, area_name, imd_decile, imd_rank, year
//
// The alias lists below allow the library to remain resilient to minor
// schema changes and to work with both table families.

const KEY_ALIASES: Record<string, string[]> = {
  // Canonical: 'code' (uk_master_*). Also accept lsoa_code for lsoa_tiles_* family.
  code:       ['code', 'lsoa_code', 'LSOA11CD', 'lsoa11cd', 'LSOA21CD', 'lsoa21cd'],
  // Canonical: 'area_name' for both table families.
  area_name:  ['area_name', 'LSOA11NM', 'lsoa11nm', 'LSOA21NM', 'lsoa21nm', 'name'],
  imd_decile: ['imd_decile', 'IMD_Decile', 'IMDDecile', 'decile', 'imd_rank_decile'],
  imd_rank:   ['imd_rank', 'IMD_Rank', 'rank'],
  imd_year:   ['imd_year', 'IMD_Year'],
  nation:     ['nation', 'Nation', 'country', 'Country'],
  year:       ['year', 'Year'],
  // Health / administrative boundary codes
  la_code:    ['la_code', 'LAD_code', 'lad_code'],
  la_name:    ['la_name', 'LAD_name', 'lad_name'],
  nhser_code: ['nhser_code', 'NHSER_code'],
  nhser_name: ['nhser_name', 'NHSER_name'],
  icb_code:   ['icb_code', 'ICB_code'],
  icb_name:   ['icb_name', 'ICB_name'],
  lhb_code:   ['lhb_code', 'LHB_code'],
  lhb_name:   ['lhb_name', 'LHB_name'],
};

/**
 * Look up a canonical property key from a feature's properties object.
 * Tries: exact match → known aliases → case-insensitive match.
 */
export function getFeatureProperty(
  properties: Record<string, unknown> | null | undefined,
  canonicalKey: string,
): unknown {
  if (!properties) return undefined;

  if (canonicalKey in properties) return properties[canonicalKey];

  const aliases = KEY_ALIASES[canonicalKey];
  if (aliases) {
    for (const alias of aliases) {
      if (alias in properties) return properties[alias];
    }
  }

  const lowerKey = canonicalKey.toLowerCase();
  for (const [k, v] of Object.entries(properties)) {
    if (k.toLowerCase() === lowerKey) return v;
  }

  return undefined;
}
