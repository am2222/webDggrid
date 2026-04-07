import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import typedocSidebar from '../api/typedoc-sidebar.json'

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
    resolve: {
      alias: {
        'webdggrid': fileURLToPath(new URL('../../lib-esm/webdggrid.js', import.meta.url)),
      },
    },
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Demo', link: '/demo' },
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
          { text: 'Multi-Aperture', link: '/multi-aperture' },
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
