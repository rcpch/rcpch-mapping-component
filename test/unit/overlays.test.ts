import { describe, expect, it, vi } from 'vitest';
import { VectorTileSource } from 'maplibre-gl';
import { DEFAULT_STYLE } from '../../src/map/styles';
import {
	addOrUpdateLocalAuthorityOverlay,
	hideLocalAuthorityOverlay,
} from '../../src/overlays/localAuthority';
import {
	addOrUpdateNhserOverlay,
	hideNhserOverlay,
} from '../../src/overlays/healthBoundaries';

type AddedSource = {
	type: 'vector';
	tiles: string[];
	minzoom: number;
	maxzoom: number;
};

type AddedLayer = {
	id: string;
	type: 'line';
	source: string;
	'source-layer': string;
	minzoom: number;
	maxzoom: number;
	paint: Record<string, unknown>;
	layout: Record<string, unknown>;
};

class MockMap {
	private sources = new Map<string, unknown>();
	private layers = new Map<string, AddedLayer>();

	public addSourceCalls: Array<{ id: string; source: AddedSource }> = [];
	public addLayerCalls: AddedLayer[] = [];
	public setLayoutProperty = vi.fn();
	public setPaintProperty = vi.fn();

	getSource(id: string): unknown {
		return this.sources.get(id);
	}

	addSource(id: string, source: AddedSource): void {
		this.sources.set(id, source);
		this.addSourceCalls.push({ id, source });
	}

	removeSource(id: string): void {
		this.sources.delete(id);
	}

	getLayer(id: string): AddedLayer | undefined {
		return this.layers.get(id);
	}

	addLayer(layer: AddedLayer): void {
		this.layers.set(layer.id, layer);
		this.addLayerCalls.push(layer);
	}

	seedVectorTileSource(id: string): { setTiles: ReturnType<typeof vi.fn> } {
		const setTiles = vi.fn();
		const source = Object.create(VectorTileSource.prototype) as VectorTileSource & {
			setTiles: ReturnType<typeof vi.fn>;
		};
		source.setTiles = setTiles;
		this.sources.set(id, source);
		return { setTiles };
	}
}

describe('overlay tiered sources and layers', () => {
	it('adds four local authority sources/layers with tiered table names and source-layers', () => {
		const map = new MockMap();

		addOrUpdateLocalAuthorityOverlay(
			map as unknown as Parameters<typeof addOrUpdateLocalAuthorityOverlay>[0],
			'https://tiles.example.com',
			DEFAULT_STYLE,
		);

		expect(map.addSourceCalls.map((c) => c.id)).toEqual([
			'rcpch-imd-la-overlay-z0_4',
			'rcpch-imd-la-overlay-z5_7',
			'rcpch-imd-la-overlay-z8_10',
			'rcpch-imd-la-overlay-z11_14',
		]);

		expect(map.addSourceCalls.map((c) => c.source.tiles[0])).toEqual([
			'https://tiles.example.com/public.la_tiles_z0_4/{z}/{x}/{y}.pbf',
			'https://tiles.example.com/public.la_tiles_z5_7/{z}/{x}/{y}.pbf',
			'https://tiles.example.com/public.la_tiles_z8_10/{z}/{x}/{y}.pbf',
			'https://tiles.example.com/public.la_tiles_z11_14/{z}/{x}/{y}.pbf',
		]);

		expect(map.addLayerCalls.map((l) => l.id)).toEqual([
			'rcpch-imd-la-overlay-line-z0_4',
			'rcpch-imd-la-overlay-line-z5_7',
			'rcpch-imd-la-overlay-line-z8_10',
			'rcpch-imd-la-overlay-line-z11_14',
		]);

		expect(map.addLayerCalls.map((l) => l['source-layer'])).toEqual([
			'la_tiles_z0_4',
			'la_tiles_z5_7',
			'la_tiles_z8_10',
			'la_tiles_z11_14',
		]);
	});

	it('updates existing tiered NHSER vector sources via setTiles', () => {
		const map = new MockMap();
		const seeded = [
			map.seedVectorTileSource('rcpch-imd-nhser-overlay-z0_4'),
			map.seedVectorTileSource('rcpch-imd-nhser-overlay-z5_7'),
			map.seedVectorTileSource('rcpch-imd-nhser-overlay-z8_10'),
			map.seedVectorTileSource('rcpch-imd-nhser-overlay-z11_14'),
		];

		addOrUpdateNhserOverlay(
			map as unknown as Parameters<typeof addOrUpdateNhserOverlay>[0],
			'https://tiles.example.com/',
			DEFAULT_STYLE,
		);

		expect(map.addSourceCalls.length).toBe(0);
		expect(seeded[0].setTiles).toHaveBeenCalledWith([
			'https://tiles.example.com/public.nhser_tiles_2021_z0_4/{z}/{x}/{y}.pbf',
		]);
		expect(seeded[1].setTiles).toHaveBeenCalledWith([
			'https://tiles.example.com/public.nhser_tiles_2021_z5_7/{z}/{x}/{y}.pbf',
		]);
		expect(seeded[2].setTiles).toHaveBeenCalledWith([
			'https://tiles.example.com/public.nhser_tiles_2021_z8_10/{z}/{x}/{y}.pbf',
		]);
		expect(seeded[3].setTiles).toHaveBeenCalledWith([
			'https://tiles.example.com/public.nhser_tiles_2021_z11_14/{z}/{x}/{y}.pbf',
		]);
	});

	it('hides all tiered overlay layers when toggled off', () => {
		const map = new MockMap();

		addOrUpdateLocalAuthorityOverlay(
			map as unknown as Parameters<typeof addOrUpdateLocalAuthorityOverlay>[0],
			'https://tiles.example.com',
			DEFAULT_STYLE,
		);
		hideLocalAuthorityOverlay(map as unknown as Parameters<typeof hideLocalAuthorityOverlay>[0]);

		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-la-overlay-line-z0_4', 'visibility', 'none');
		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-la-overlay-line-z5_7', 'visibility', 'none');
		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-la-overlay-line-z8_10', 'visibility', 'none');
		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-la-overlay-line-z11_14', 'visibility', 'none');

		map.setLayoutProperty.mockClear();
		addOrUpdateNhserOverlay(
			map as unknown as Parameters<typeof addOrUpdateNhserOverlay>[0],
			'https://tiles.example.com',
			DEFAULT_STYLE,
		);
		hideNhserOverlay(map as unknown as Parameters<typeof hideNhserOverlay>[0]);

		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-nhser-overlay-line-z0_4', 'visibility', 'none');
		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-nhser-overlay-line-z5_7', 'visibility', 'none');
		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-nhser-overlay-line-z8_10', 'visibility', 'none');
		expect(map.setLayoutProperty).toHaveBeenCalledWith('rcpch-imd-nhser-overlay-line-z11_14', 'visibility', 'none');
	});
});
