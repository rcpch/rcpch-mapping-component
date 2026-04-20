import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM build — maplibre-gl is a peer dependency, kept external.
  // For use by bundlers (Vite, webpack, etc.) and modern JS consumers.
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    outDir: 'dist',
    outExtension: () => ({ js: '.esm.js' }),
    dts: true,
    clean: true,
    external: ['maplibre-gl'],
    sourcemap: true,
    treeshake: true,
    platform: 'browser',
  },
  // IIFE / UMD build — maplibre-gl is bundled so the output is self-contained.
  // For script-tag use in Django templates, static HTML pages, and CDN delivery.
  // Consumers do NOT need to load maplibre-gl separately when using this build.
  {
    entry: { 'rcpch-imd-map.min': 'src/index.ts' },
    format: ['iife'],
    outDir: 'dist/umd',
    outExtension: () => ({ js: '.js' }),
    globalName: 'RcpchImdMap',
    // maplibre-gl is intentionally not external here so the IIFE is self-contained.
    minify: true,
    sourcemap: false,
    platform: 'browser',
    esbuildOptions(options) {
      options.conditions = ['browser'];
    },
  },
]);
