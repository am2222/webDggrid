import { defineConfig } from 'vitepress'
import typedocSidebar from '../api/typedoc-sidebar.json'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

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
    plugins: [
      {
        name: 'dev-static-middleware',
        apply: 'serve',
        configureServer(server) {
          const root = process.cwd()

          // 1. Serve /dist/* from the project-root dist/ folder.
          //    Required because VitePress only roots itself in docs/ and
          //    the browser requests /dist/index.js as an ES module import
          //    from example.html.
          const distDir = path.resolve(root, 'dist')
          server.middlewares.use('/dist', (req, res, next) => {
            const filePath = path.join(distDir, (req as any).url ?? '/')
            if (existsSync(filePath)) {
              const ext = path.extname(filePath)
              const mime: Record<string, string> = {
                '.js':  'application/javascript',
                '.mjs': 'application/javascript',
                '.map': 'application/json',
              }
              res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream')
              res.end(readFileSync(filePath))
            } else {
              next()
            }
          })

          // 2. Serve /webDggrid/* from docs/public/ so that the base-prefixed
          //    URL matches in dev mode (Vite serves publicDir at / not at base).
          const publicDir = path.resolve(root, 'docs/public')
          server.middlewares.use('/webDggrid', (req, res, next) => {
            const filePath = path.join(publicDir, (req as any).url ?? '/')
            if (existsSync(filePath) && !filePath.endsWith('/')) {
              const ext = path.extname(filePath)
              const mime: Record<string, string> = {
                '.html': 'text/html; charset=utf-8',
                '.js':   'application/javascript',
                '.css':  'text/css',
                '.json': 'application/json',
              }
              res.setHeader('Content-Type', mime[ext] ?? 'text/plain')
              res.end(readFileSync(filePath))
            } else {
              next()
            }
          })
        }
      }
    ]
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Demo', link: '/demo' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
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
