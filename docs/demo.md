---
layout: page
title: Live Demo
---

<script setup>
import { withBase } from 'vitepress'
</script>

<style scoped>
.demo-wrap {
  width: 100%;
  height: calc(100vh - var(--vp-nav-height, 64px));
  overflow: hidden;
}
.demo-wrap iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>

<div class="demo-wrap">
  <iframe :src="withBase('/example.html')" allowfullscreen />
</div>
