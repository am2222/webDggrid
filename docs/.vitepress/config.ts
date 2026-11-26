import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vitepress'
import typedocSidebar from '../api/typedoc-sidebar.json'

// Navara's prebuilt web workers load their WASM by a fixed file name next to
// the worker script, e.g. `navara_wasm_worker_bg-Dz-ZtOf1.wasm`. VitePress
// names assets `[name].[hash]` (and won't let a config override that), so in
// production builds the workers 404 on their WASM and cells and labels never
// appear. Read the names the emitted worker scripts ask for and rename the
// matching WASM assets to them.
function navaraWorkerWasmNames(): Plugin {
  const REQUESTED = /navara_wasm_\w*?worker_bg-[\w-]+\.wasm/g
  return {
    name: 'navara-worker-wasm-names',
    apply: 'build',
    generateBundle(_options, bundle) {
      const requested = new Set<string>()
      for (const file of Object.values(bundle)) {
        const text = file.type === 'chunk' ? file.code
          : typeof file.source === 'string' ? file.source
          : file.fileName.endsWith('.js') ? new TextDecoder().decode(file.source) : ''
        for (const m of text.matchAll(REQUESTED)) requested.add(m[0])
      }
      for (const want of requested) {
        // navara_wasm_worker_bg-Dz-ZtOf1.wasm <- the asset named navara_wasm_worker_bg.wasm
        const base = want.replace(/-[\w-]+\.wasm$/, '.wasm')
        const entry = Object.entries(bundle).find(([, f]) =>
          f.type === 'asset' && (f.names ?? []).includes(base))
        if (!entry) {
          this.warn(`no asset for ${want}; Navara workers will fail to load it`)
          continue
        }
        const [key, file] = entry
        const fileName = path.posix.join(path.posix.dirname(file.fileName), want)
        delete bundle[key]
        file.fileName = fileName
        bundle[fileName] = file
      }
    },
  }
}

const sidebarModified = typedocSidebar.map((groups) => {
  const items = groups.items.map((item) => {
    return { ...item, link: item.link.replace('/docs', '') }
  })
  return { ...groups, items }
})

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "WebDggrid",
  description: "A webassembly version of DGGRID",
  base: "/webDggrid/",

  vite: {
    plugins: [navaraWorkerWasmNames()],
    resolve: {
      alias: {
        'webdggrid': fileURLToPath(new URL('../../lib-esm/webdggrid.js', import.meta.url)),
      },
      // one copy of three for Navara and its default plugin
      dedupe: ['three'],
    },
    // Navara loads its WASM and workers via import.meta.url, which
    // prebundling breaks (maplibre/navara#744)
    optimizeDeps: {
      exclude: ['@navaramap/three', '@navaramap/three-default-plugin', '@navaramap/three-default-descs'],
    },
    worker: { format: 'es' },
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Demo', link: '/demo' },
      { text: 'Navara Demo', link: '/demo-navara' },
      { text: 'Contributing', link: '/contributing' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Geometry Notes', link: '/geometry-notes' },
          { text: 'Address Types', link: '/address-types' },
          { text: 'Hierarchical Operations', link: '/hierarchical-operations' },
          { text: 'Hierarchical Address Types', link: '/hierarchical-addresses' },
          { text: 'Index Arithmetic', link: '/index-arithmetic' },
          { text: 'IGEO7 / Z7 Index', link: '/igeo7' },
          { text: 'Authalic Conversion', link: '/authalic' },
          { text: 'Multi-Aperture', link: '/multi-aperture' },
          { text: 'Projections, Datums & Presets', link: '/grid-options' },
        ],
      },
      {
        text: 'Project',
        items: [
          { text: 'Contributing', link: '/contributing' },
        ],
      },
      {
        text: 'API',
        items: sidebarModified,
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/am2222/webDggrid' }
    ]
  }
})
