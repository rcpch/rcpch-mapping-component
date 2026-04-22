import { VectorTileSource } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapStyleOptions } from '../types/public';
import { buildTileUrl } from '../core/resolver';

export const LOCAL_AUTHORITY_SOURCE_ID = 'rcpch-imd-la-overlay';
export const LOCAL_AUTHORITY_LAYER_ID = 'rcpch-imd-la-overlay-line';

const LOCAL_AUTHORITY_FULL_TABLE_NAME = 'public.la_tiles';
const LOCAL_AUTHORITY_SOURCE_LAYER = 'public.la_tiles';

export function addOrUpdateLocalAuthorityOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	style: Required<MapStyleOptions>,
): void {
	const tileUrl = buildTileUrl(tilesBaseUrl, LOCAL_AUTHORITY_FULL_TABLE_NAME);
	const existing = map.getSource(LOCAL_AUTHORITY_SOURCE_ID);

	if (existing instanceof VectorTileSource) {
		existing.setTiles([tileUrl]);
	} else {
		if (existing) map.removeSource(LOCAL_AUTHORITY_SOURCE_ID);
		map.addSource(LOCAL_AUTHORITY_SOURCE_ID, {
			type: 'vector',
			tiles: [tileUrl],
			minzoom: 0,
			maxzoom: 14,
		});
	}

	if (map.getLayer(LOCAL_AUTHORITY_LAYER_ID)) {
		map.setPaintProperty(
			LOCAL_AUTHORITY_LAYER_ID,
			'line-color',
			style.boundaries.localAuthorityColor ?? '#0d0d58',
		);
		map.setPaintProperty(
			LOCAL_AUTHORITY_LAYER_ID,
			'line-width',
			style.boundaries.localAuthorityWidth ?? 1,
		);
		map.setLayoutProperty(LOCAL_AUTHORITY_LAYER_ID, 'visibility', 'visible');
		return;
	}

	map.addLayer({
		id: LOCAL_AUTHORITY_LAYER_ID,
		type: 'line',
		source: LOCAL_AUTHORITY_SOURCE_ID,
		'source-layer': LOCAL_AUTHORITY_SOURCE_LAYER,
		paint: {
			'line-color': style.boundaries.localAuthorityColor ?? '#0d0d58',
			'line-width': style.boundaries.localAuthorityWidth ?? 1,
		},
		layout: {
			visibility: 'visible',
		},
	});
}

export function hideLocalAuthorityOverlay(map: MaplibreMap): void {
	if (map.getLayer(LOCAL_AUTHORITY_LAYER_ID)) {
		map.setLayoutProperty(LOCAL_AUTHORITY_LAYER_ID, 'visibility', 'none');
	}
}
