import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import DggsGlobe from './components/DggsGlobe.vue'
import DggsD3Globe from './components/DggsD3Globe.vue'
import DggsHeroBackground from './components/DggsHeroBackground.vue'
import DggsAddressTypesDemo from './components/DggsAddressTypesDemo.vue'
import DggsD3HierarchyDemo from './components/DggsD3HierarchyDemo.vue'
import Igeo7Demo from './components/Igeo7Demo.vue'
import AuthalicDemo from './components/AuthalicDemo.vue'

export default {
  extends: DefaultTheme,

  enhanceApp({ app }: { app: any }) {
    app.component('DggsGlobe', DggsGlobe)
    app.component('DggsD3Globe', DggsD3Globe)
    app.component('DggsHeroBackground', DggsHeroBackground)
    app.component('DggsAddressTypesDemo', DggsAddressTypesDemo)
    app.component('DggsD3HierarchyDemo', DggsD3HierarchyDemo)
    app.component('Igeo7Demo', Igeo7Demo)
    app.component('AuthalicDemo', AuthalicDemo)
  },

  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(DggsHeroBackground),
    })
  },
}
