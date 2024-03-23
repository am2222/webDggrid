import { defineConfig } from 'vitepress'
import typedocSidebar from '../api/typedoc-sidebar.json';


const sidebarModified = typedocSidebar.map((groups) => {
  const items = groups.items.map((item) => {

    return { ...item, link: item.link.replace('/docs', '') }
  })
  return { ...groups, items }
})

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "WebDggrid",
  description: "A webassembely version of DGGRID",
  base: "/webDggrid/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API', link: '/api/' },
      { text: 'Demo', link: 'example.html' }
    ],

    sidebar: [
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
