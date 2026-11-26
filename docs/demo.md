---
layout: page
title: Live Demo
sidebar: false
---

<ClientOnly>
  <DggsGlobe
    :show-basemap="true"
    :show-controls="true"
    :auto-generate="true"
    height="calc(100dvh - var(--vp-nav-height, 64px))"
  />
</ClientOnly>
