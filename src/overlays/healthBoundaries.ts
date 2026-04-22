import { VectorTileSource } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapStyleOptions } from '../types/public';
import { buildTileUrl } from '../core/resolver';

export const NHSER_SOURCE_ID = 'rcpch-imd-nhser-overlay';
export const NHSER_LAYER_ID = 'rcpch-imd-nhser-overlay-line';
export const ICB_SOURCE_ID = 'rcpch-imd-icb-overlay';
export const ICB_LAYER_ID = 'rcpch-imd-icb-overlay-line';
export const LHB_SOURCE_ID = 'rcpch-imd-lhb-overlay';
export const LHB_LAYER_ID = 'rcpch-imd-lhb-overlay-line';

const NHSER_FULL_TABLE_NAME = 'public.nhser_tiles_2021';
const NHSER_SOURCE_LAYER = 'public.nhser_tiles_2021';
const ICB_FULL_TABLE_NAME = 'public.icb_tiles_2023';
const ICB_SOURCE_LAYER = 'public.icb_tiles_2023';
const LHB_FULL_TABLE_NAME = 'public.lhb_tiles_2022';
const LHB_SOURCE_LAYER = 'public.lhb_tiles_2022';

function addOrUpdateBoundaryOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	input: {
		sourceId: string;
		layerId: string;
		fullTableName: string;
		sourceLayer: string;
		lineColor: string;
		lineWidth: number;
	},
): void {
	const tileUrl = buildTileUrl(tilesBaseUrl, input.fullTableName);
	const existing = map.getSource(input.sourceId);

	if (existing instanceof VectorTileSource) {
		existing.setTiles([tileUrl]);
	} else {
		if (existing) map.removeSource(input.sourceId);
		map.addSource(input.sourceId, {
			type: 'vector',
			tiles: [tileUrl],
			minzoom: 0,
			maxzoom: 14,
		});
	}

	if (map.getLayer(input.layerId)) {
		map.setPaintProperty(input.layerId, 'line-color', input.lineColor);
		map.setPaintProperty(input.layerId, 'line-width', input.lineWidth);
		map.setLayoutProperty(input.layerId, 'visibility', 'visible');
		return;
	}

	map.addLayer({
		id: input.layerId,
		type: 'line',
		source: input.sourceId,
		'source-layer': input.sourceLayer,
		paint: {
			'line-color': input.lineColor,
			'line-width': input.lineWidth,
		},
		layout: {
			visibility: 'visible',
		},
	});
}

export function addOrUpdateNhserOverlay(
	map: MaplibreMap,
	tilesBaseUrl: string,
	style: Required<MapStyleOptions>,
): void {
	addOrUpdateBoundaryOverlay(map, tilesBaseUrl, {
		sourceId: NHSER_SOURCE_ID,
		layerId: NHSER_LAYER_ID,
		fullTableName: NHSER_FULL_TABLE_NAME,
		sourceLayer: NHSER_SOURCE_LAYER,
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
		fullTableName: ICB_FULL_TABLE_NAME,
		sourceLayer: ICB_SOURCE_LAYER,
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
		fullTableName: LHB_FULL_TABLE_NAME,
		sourceLayer: LHB_SOURCE_LAYER,
		lineColor: style.boundaries.lhbColor ?? '#57c7f2',
		lineWidth: style.boundaries.lhbWidth ?? 1,
	});
}

function hideOverlay(map: MaplibreMap, layerId: string): void {
	if (map.getLayer(layerId)) {
		map.setLayoutProperty(layerId, 'visibility', 'none');
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
