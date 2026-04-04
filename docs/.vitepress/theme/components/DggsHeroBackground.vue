<script setup>
import DggsD3Globe from './DggsD3Globe.vue'

defineProps({
  resolution: { type: Number, default: 3 },
  topology:   { type: String, default: 'HEXAGON' },
  projection: { type: String, default: 'ISEA' },
  aperture:   { type: Number, default: 4 },
})
</script>

<template>
  <div class="hero-globe-frame">
    <div class="ring ring-outer" />
    <div class="ring ring-inner" />
    <DggsD3Globe
      :resolution="resolution"
      :topology="topology"
      :projection="projection"
      :aperture="aperture"
      :spin="true"
      :spin-speed="0.35"
      :interactive="true"
      :show-controls="true"
      :graticule="true"
      :continents="true"
      :initial-rotation="[-20, -25, 0]"
      stroke-color="rgba(160, 240, 255, 0.95)"
      fill-color="rgba(80, 170, 255, 0.22)"
      sphere-stroke="rgba(120, 210, 255, 0.55)"
    />
  </div>
</template>

<style scoped>
.hero-globe-frame {
  position: relative;
  width: 360px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  /* rings sit behind the globe SVG */
  top: 0; left: 10px; right: 10px;
  aspect-ratio: 1;
}

.ring-outer {
  inset: -12px 2px;
  border: 1px solid rgba(80, 180, 255, 0.12);
  animation: ring-pulse 4s ease-in-out infinite;
}

.ring-inner {
  inset: -4px 10px;
  border: 1px solid rgba(80, 180, 255, 0.22);
  animation: ring-pulse 4s ease-in-out infinite 1s;
}

@keyframes ring-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1);    }
  50%       { opacity: 1;   transform: scale(1.01); }
}
</style>
