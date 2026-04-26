import { VectorTileSource } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapStyleOptions } from '../types/public';
import { buildTileUrl, ZOOM_TIERS } from '../core/resolver';

export const NHSER_SOURCE_ID = 'rcpch-imd-nhser-overlay';
export const NHSER_LAYER_ID = 'rcpch-imd-nhser-overlay-line';
export const ICB_SOURCE_ID = 'rcpch-imd-icb-overlay';
export const ICB_LAYER_ID = 'rcpch-imd-icb-overlay-line';
export const LHB_SOURCE_ID = 'rcpch-imd-lhb-overlay';
export const LHB_LAYER_ID = 'rcpch-imd-lhb-overlay-line';

const NHSER_TABLE_PREFIX = 'nhser_tiles_2021';
const ICB_TABLE_PREFIX = 'icb_tiles_2023';
const LHB_TABLE_PREFIX = 'lhb_tiles_2022';

function overlaySourceId(baseSourceId: string, tier: string): string {
	return `${baseSourceId}-${tier}`;
}

function overlayLayerId(baseLayerId: string, tier: string): string {
	return `${baseLayerId}-${tier}`;
}

function addOrUpdateBoundaryOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	input: {
		sourceId: string;
		layerId: string;
		tablePrefix: string;
		lineColor: string;
		lineWidth: number;
	},
): void {
	for (const { tier, minzoom, maxzoom } of ZOOM_TIERS) {
		const sourceId = overlaySourceId(input.sourceId, tier);
		const layerId = overlayLayerId(input.layerId, tier);
		const fullTableName = `public.${input.tablePrefix}_${tier}`;
		const sourceLayer = `${input.tablePrefix}_${tier}`;
		const tileUrl = buildTileUrl(tilesBaseUrl, fullTableName);
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
			map.setPaintProperty(layerId, 'line-color', input.lineColor);
			map.setPaintProperty(layerId, 'line-width', input.lineWidth);
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
				'line-color': input.lineColor,
				'line-width': input.lineWidth,
			},
			layout: {
				visibility: 'visible',
			},
		});
	}
}

export function addOrUpdateNhserOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	style: Required<MapStyleOptions>,
): void {
	addOrUpdateBoundaryOverlay(map, tilesBaseUrl, {
		sourceId: NHSER_SOURCE_ID,
		layerId: NHSER_LAYER_ID,
		tablePrefix: NHSER_TABLE_PREFIX,
		lineColor: style.boundaries.nhserColor ?? '#e00087',
		lineWidth: style.boundaries.nhserWidth ?? 1.5,
	});
}

export function addOrUpdateIcbOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	style: Required<MapStyleOptions>,
): void {
	addOrUpdateBoundaryOverlay(map, tilesBaseUrl, {
		sourceId: ICB_SOURCE_ID,
		layerId: ICB_LAYER_ID,
		tablePrefix: ICB_TABLE_PREFIX,
		lineColor: style.boundaries.icbColor ?? '#57c7f2',
		lineWidth: style.boundaries.icbWidth ?? 1,
	});
}

export function addOrUpdateLhbOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	style: Required<MapStyleOptions>,
): void {
	addOrUpdateBoundaryOverlay(map, tilesBaseUrl, {
		sourceId: LHB_SOURCE_ID,
		layerId: LHB_LAYER_ID,
		tablePrefix: LHB_TABLE_PREFIX,
		lineColor: style.boundaries.lhbColor ?? '#57c7f2',
		lineWidth: style.boundaries.lhbWidth ?? 1,
	});
}

function hideOverlay(map: MaplibreMap, layerId: string): void {
	for (const { tier } of ZOOM_TIERS) {
		const tierLayerId = overlayLayerId(layerId, tier);
		if (map.getLayer(tierLayerId)) {
			map.setLayoutProperty(tierLayerId, 'visibility', 'none');
		}
	}
}

export function hideNhserOverlay(map: MaplibreMap): void {
	hideOverlay(map, NHSER_LAYER_ID);
}

export function hideIcbOverlay(map: MaplibreMap): void {
	hideOverlay(map, ICB_LAYER_ID);
}

export function hideLhbOverlay(map: MaplibreMap): void {
	hideOverlay(map, LHB_LAYER_ID);
}
