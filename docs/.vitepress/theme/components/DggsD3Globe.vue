<script setup>
/**
 * DggsD3Globe — SVG globe rendered with D3 geoOrthographic.
 *
 * Uses the same approach as the reference HTML example:
 *  - SVG paths, not canvas — D3 only updates the `d` attribute each frame
 *  - d3.timer for spin — built-in RAF scheduling, no manual loop management
 *  - d3.drag for interaction — smooth, handles pointer capture automatically
 *  - Clip-path on the sphere — no fixed-radius hack, tracks projection changes
 *  - D3 handles polar cells and antimeridian natively via spherical clipping
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  resolution:      { type: Number,  default: 3 },
  topology:        { type: String,  default: 'HEXAGON' },
  projection:      { type: String,  default: 'ISEA' },
  aperture:        { type: Number,  default: 4 },
  spin:            { type: Boolean, default: true },
  spinSpeed:       { type: Number,  default: 0.35 },
  interactive:     { type: Boolean, default: true },
  initialRotation: { type: Array,   default: () => [-20, -25, 0] },
  strokeColor:     { type: String,  default: 'rgba(160, 240, 255, 0.95)' },
  fillColor:       { type: String,  default: 'rgba(80, 170, 255, 0.22)' },
  sphereStroke:    { type: String,  default: 'rgba(120, 210, 255, 0.55)' },
  graticule:       { type: Boolean, default: true },
  continents:      { type: Boolean, default: true },
})

const wrapRef = ref(null)

// All D3/DOM state — non-reactive
let geoProj      = null
let pathGen      = null
let svgSel       = null   // D3 selection of <svg>
let clipSel      = null   // D3 selection of clip-path <path>
let landSel      = null   // D3 selection of land <path>
let gratSel      = null   // D3 selection of graticule <path>
let cellSel      = null   // D3 selection of cells <path>
let rimSel       = null   // D3 selection of sphere rim <path>
let webdggrid    = null
let geojson      = null
let landGeojson  = null   // fetched once, reused on resize
let timer        = null   // d3.timer instance
let resizeObs    = null
let W = 0, H = 0

// ─── CDN ─────────────────────────────────────────────────────────────────────

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = Object.assign(document.createElement('script'), {
      src, onload: resolve,
      onerror: () => reject(new Error(`Failed to load ${src}`)),
    })
    document.head.appendChild(s)
  })
}

// ─── Render — just re-stamp the `d` attribute on each path ───────────────────

function render() {
  if (!pathGen) return
  clipSel?.attr('d', pathGen)
  landSel?.attr('d', pathGen)
  gratSel?.attr('d', pathGen)
  cellSel?.attr('d', pathGen)
  rimSel?.attr('d', pathGen)
}

// ─── Continents ──────────────────────────────────────────────────────────────

async function fetchLand() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js')
    const world = await window.d3.json(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
    )
    landGeojson = window.topojson.feature(world, world.objects.land)
    if (landSel) landSel.datum(landGeojson).attr('d', pathGen)
  } catch (_) {
    // Globe still works without land
  }
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function generateGrid() {
  if (!webdggrid || !cellSel) return

  webdggrid.setDggs({
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    topology: props.topology,
    projection: props.projection,
    aperture:   props.aperture,
  }, props.resolution)

  const total   = webdggrid.nCells(props.resolution)
  const seqNums = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1))
  const fc      = webdggrid.sequenceNumToGridFeatureCollection(seqNums, props.resolution)

  // Normalise webdggrid's [0°,360°] unwrap → D3's [-180°,180°]
  for (const f of fc.features) {
    if (typeof f.id === 'bigint') f.id = f.id.toString()
    f.geometry.coordinates = f.geometry.coordinates.map(ring =>
      ring.map(([lng, lat]) => [lng > 180 ? lng - 360 : lng, lat])
    )
  }

  geojson = fc
  cellSel.datum(geojson).attr('d', pathGen)
}

// ─── SVG setup (called on mount and on resize) ───────────────────────────────

function buildSvg(w, h) {
  W = w; H = h
  const d3 = window.d3
  const cx = w / 2, cy = h / 2
  const r  = Math.min(w, h) / 2 - 4

  // Tear down previous SVG cleanly
  d3.select(wrapRef.value).select('svg').remove()
  if (timer) { timer.stop(); timer = null }

  geoProj = d3.geoOrthographic()
    .scale(r)
    .translate([cx, cy])
    .rotate([...props.initialRotation])
    .clipAngle(90)
    .precision(1.5)

  pathGen = d3.geoPath().projection(geoProj)

  svgSel = d3.select(wrapRef.value)
    .append('svg')
    .attr('width', w).attr('height', h)
    .style('display', 'block')
    .style('background', 'transparent')
    .style('cursor', props.interactive ? 'grab' : 'default')

  const defs = svgSel.append('defs')

  // Radial gradient — visible ocean blue with lighter highlight
  const grad = defs.append('radialGradient')
    .attr('id', 'dggs-d3-grad').attr('cx', '36%').attr('cy', '30%')
  grad.append('stop').attr('offset', '0%')
    .attr('stop-color', '#1e5fa8')
  grad.append('stop').attr('offset', '60%')
    .attr('stop-color', '#0d3d7a')
  grad.append('stop').attr('offset', '100%')
    .attr('stop-color', '#071f4a')

  // Sphere clip-path (tracks projection changes via render())
  clipSel = defs.append('clipPath').attr('id', 'dggs-d3-clip')
    .append('path').datum({ type: 'Sphere' }).attr('d', pathGen)

  // Sphere background fill
  svgSel.append('path')
    .datum({ type: 'Sphere' })
    .attr('d', pathGen)
    .attr('fill', 'url(#dggs-d3-grad)')

  // Land / continents — populated after fetchLand() resolves
  if (props.continents) {
    landSel = svgSel.append('path')
      .datum(landGeojson ?? { type: 'GeometryCollection', geometries: [] })
      .attr('d', pathGen)
      .attr('clip-path', 'url(#dggs-d3-clip)')
      .attr('fill', '#2d7a45')
      .attr('stroke', 'rgba(180, 240, 195, 0.5)')
      .attr('stroke-width', 0.4)
  }

  // Graticule
  if (props.graticule) {
    gratSel = svgSel.append('path')
      .datum(d3.geoGraticule().step([15, 15])())
      .attr('d', pathGen)
      .attr('clip-path', 'url(#dggs-d3-clip)')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(140, 200, 255, 0.22)')
      .attr('stroke-width', 0.6)
  }

  // DGGS cells — single <path> for the entire FeatureCollection
  cellSel = svgSel.append('path')
    .datum(geojson ?? { type: 'FeatureCollection', features: [] })
    .attr('d', pathGen)
    .attr('clip-path', 'url(#dggs-d3-clip)')
    .attr('fill', props.fillColor)
    .attr('stroke', props.strokeColor)
    .attr('stroke-width', 0.85)
    .attr('stroke-linejoin', 'round')

  // Sphere rim (drawn on top so it covers clipped cell edges)
  rimSel = svgSel.append('path')
    .datum({ type: 'Sphere' })
    .attr('d', pathGen)
    .attr('fill', 'none')
    .attr('stroke', props.sphereStroke)
    .attr('stroke-width', 1)

  // ── Drag interaction ──
  if (props.interactive) {
    const k = () => 75 / geoProj.scale()
    svgSel.call(
      d3.drag()
        .on('start', () => {
          svgSel.style('cursor', 'grabbing')
          if (timer) { timer.stop(); timer = null }
        })
        .on('drag', (e) => {
          const [lam, phi, gam] = geoProj.rotate()
          geoProj.rotate([
            lam + e.dx * k(),
            Math.max(-85, Math.min(85, phi - e.dy * k())),
            gam,
          ])
          render()
        })
        .on('end', () => {
          svgSel.style('cursor', 'grab')
          if (props.spin) startSpin()
        })
    )
  }
}

// ─── Spin — d3.timer fires on every rAF tick automatically ───────────────────

function startSpin() {
  if (timer) { timer.stop(); timer = null }
  timer = window.d3.timer(() => {
    const [lam, phi, gam] = geoProj.rotate()
    geoProj.rotate([lam + props.spinSpeed, phi, gam])
    render()
  })
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(async () => {
  if (typeof window === 'undefined') return

  if (!BigInt.prototype.toJSON)
    BigInt.prototype.toJSON = function () { return this.toString() }

  try {
    await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js')
    const { Webdggrid } = await new Function('return import("/dist/index.js")')()
    webdggrid = await Webdggrid.load()

    const rect = wrapRef.value.getBoundingClientRect()
    buildSvg(rect.width || 420, rect.height || 420)
    generateGrid()
    if (props.spin) startSpin()
    if (props.continents) fetchLand()  // runs in parallel, updates land layer when ready

    resizeObs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (Math.abs(width - W) < 1 && Math.abs(height - H) < 1) return
      buildSvg(width, height)
      generateGrid()
      if (props.spin) startSpin()
    })
    resizeObs.observe(wrapRef.value)

  } catch (err) {
    console.error('[DggsD3Globe]', err)
  }
})

onUnmounted(() => {
  if (timer)     { timer.stop(); timer = null }
  if (resizeObs) resizeObs.disconnect()
})

defineExpose({ regenerate: generateGrid })
</script>

<template>
  <div ref="wrapRef" class="d3-globe-wrap" />
</template>

<style scoped>
.d3-globe-wrap {
  width: 100%;
  height: 100%;
  background: transparent;
}
</style>
