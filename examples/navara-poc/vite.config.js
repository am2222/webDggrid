import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  server: {
    port: 5180,
    // the page imports the built webdggrid from ../../dist
    fs: { allow: [repoRoot] },
  },
  // Navara loads its WASM and workers via import.meta.url; prebundling breaks
  // those URLs (maplibre/navara#744)
  optimizeDeps: {
    exclude: ['@navaramap/three', '@navaramap/three-default-plugin', '@navaramap/three-default-descs'],
  },
  worker: { format: 'es' },
  // one copy of three for navara and its plugin
  resolve: { dedupe: ['three'] },
});
