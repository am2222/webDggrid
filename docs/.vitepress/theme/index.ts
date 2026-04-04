import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import DggsGlobe from './components/DggsGlobe.vue'
import DggsD3Globe from './components/DggsD3Globe.vue'
import DggsHeroBackground from './components/DggsHeroBackground.vue'

export default {
  extends: DefaultTheme,

  enhanceApp({ app }: { app: any }) {
    app.component('DggsGlobe', DggsGlobe)
    app.component('DggsD3Globe', DggsD3Globe)
    app.component('DggsHeroBackground', DggsHeroBackground)
  },

  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(DggsHeroBackground),
    })
  },
}
