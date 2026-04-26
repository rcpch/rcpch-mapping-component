import type { ZoomTier } from '../core/resolver';

const DEFAULT_TILES_SCHEMA = 'public';

/**
 * Build a schema-qualified pg_tileserv table/layer identifier for a zoom tier.
 * Kept shared so tile URL table ids and source-layer names always match.
 */
export function buildMvtLayerName(baseName: string, tier: ZoomTier, schema = DEFAULT_TILES_SCHEMA): string {
	return `${schema}.${baseName}_${tier}`;
}
