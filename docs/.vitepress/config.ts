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
          { text: 'Geometry Notes', link: '/getting-started#geometry-notes' },
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
