import { VectorTileSource } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapStyleOptions } from '../types/public';
import { buildTileUrl, ZOOM_TIERS } from '../core/resolver';
import type { TileAuthOptions } from '../core/resolver';
import { buildMvtLayerName } from './mvtLayerName';

export const LOCAL_AUTHORITY_SOURCE_ID = 'rcpch-imd-la-overlay';
export const LOCAL_AUTHORITY_LAYER_ID = 'rcpch-imd-la-overlay-line';

const LOCAL_AUTHORITY_TABLE_PREFIX = 'la_tiles';

function localAuthoritySourceId(tier: string): string {
	return `${LOCAL_AUTHORITY_SOURCE_ID}-${tier}`;
}

function localAuthorityLayerId(tier: string): string {
	return `${LOCAL_AUTHORITY_LAYER_ID}-${tier}`;
}

export function addOrUpdateLocalAuthorityOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	style: Required<MapStyleOptions>,
	tileAuth?: TileAuthOptions,
): void {
	for (const { tier, minzoom, maxzoom } of ZOOM_TIERS) {
		const sourceId = localAuthoritySourceId(tier);
		const layerId = localAuthorityLayerId(tier);
		const fullTableName = buildMvtLayerName(LOCAL_AUTHORITY_TABLE_PREFIX, tier);
		const sourceLayer = fullTableName;
		const tileUrl = buildTileUrl(tilesBaseUrl, fullTableName, tileAuth);
		const existing = map.getSource(sourceId);

		if (existing instanceof VectorTileSource) {
			existing.setTiles([tileUrl]);
		} else {
			if (existing) map.removeSource(sourceId);
			map.addSource(sourceId, {
				type: 'vector',
				tiles: [tileUrl],
				minzoom: 0,
				maxzoom: 14,
			});
		}

		if (map.getLayer(layerId)) {
			map.setPaintProperty(
				layerId,
				'line-color',
				style.boundaries.localAuthorityColor ?? '#0d0d58',
			);
			map.setPaintProperty(
				layerId,
				'line-width',
				style.boundaries.localAuthorityWidth ?? 1,
			);
			map.setLayoutProperty(layerId, 'visibility', 'visible');
			continue;
		}

		map.addLayer({
			id: layerId,
			type: 'line',
			source: sourceId,
			'source-layer': sourceLayer,
			minzoom,
			maxzoom,
			paint: {
				'line-color': style.boundaries.localAuthorityColor ?? '#0d0d58',
				'line-width': style.boundaries.localAuthorityWidth ?? 1,
			},
			layout: {
				visibility: 'visible',
			},
		});
	}
}

export function hideLocalAuthorityOverlay(map: MaplibreMap): void {
	for (const { tier } of ZOOM_TIERS) {
		const layerId = localAuthorityLayerId(tier);
		if (map.getLayer(layerId)) {
			map.setLayoutProperty(layerId, 'visibility', 'none');
		}
	}
}
