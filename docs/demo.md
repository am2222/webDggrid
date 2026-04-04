---
layout: page
title: Live Demo
---

<ClientOnly>
  <DggsGlobe
    :show-basemap="true"
    :show-controls="true"
    :auto-generate="true"
    height="calc(100vh - var(--vp-nav-height, 64px))"
  />
</ClientOnly>
