<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ylOrBrRgba, processFcForGlobe } from '../utils/globeUtils.js'

const props = defineProps({
  /** Show OSM raster basemap */
  showBasemap: { type: Boolean, default: true },
  /** Show the controls panel */
  showControls: { type: Boolean, default: true },
  /** CSS height of the map container */
  height: { type: String, default: '100vh' },
  /** Generate grid immediately on load (no button click needed) */
  autoGenerate: { type: Boolean, default: false },
  // Initial grid settings (all overridable from controls when showControls=true)
  initialResolution: { type: Number, default: 3 },
  initialTopology: { type: String, default: 'HEXAGON' },
  initialProjection: { type: String, default: 'ISEA' },
  initialAperture: { type: Number, default: 4 },
  initialAzimuth: { type: Number, default: 0 },
  initialPoleLng: { type: Number, default: 0 },
  initialPoleLat: { type: Number, default: 0 },
  initialCenter: { type: Array, default: () => [0, 20] },
  initialZoom: { type: Number, default: 1.8 },
  /** Cell fill color [r,g,b,a] */
  fillColor: { type: Array, default: () => [51, 136, 255, 71] },
  /** Cell line color [r,g,b,a] */
  lineColor: { type: Array, default: () => [0, 85, 204, 220] },
  /** Allow map pan/zoom interaction */
  interactive: { type: Boolean, default: true },
})

// --- template refs ---
const mapContainer = ref(null)
const tooltipEl    = ref(null)

// --- reactive control state ---
const status      = ref('Loading WASM…')
const isReady     = ref(false)
const isGenerating = ref(false)

const ctrlResolution   = ref(props.initialResolution)
const ctrlMaxResLabel  = ref('Resolution')
const ctrlTopology     = ref(props.initialTopology)
const ctrlProjection   = ref(props.initialProjection)
const ctrlAperture     = ref(props.initialAperture)
const ctrlAzimuth      = ref(props.initialAzimuth)
const ctrlPoleLng      = ref(props.initialPoleLng)
const ctrlPoleLat      = ref(props.initialPoleLat)
const ctrlColorCells   = ref(false)
const ctrlMultiRes     = ref(false)
const ctrlZoomOffset   = ref(0)
const showAperture     = ref(props.initialTopology === 'HEXAGON')

// --- non-reactive map state (reactivity on MapLibre objects causes issues) ---
let map           = null
let deckOverlay   = null
let webdggrid     = null
let poleMarker    = null
let lastFineFc    = null
let lastBaseFc    = null
let multiResTimer = null

// ---------------------------------------------------------------------------
// CDN helpers
// ---------------------------------------------------------------------------

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function loadLink(href) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const l = document.createElement('link')
  l.rel  = 'stylesheet'
  l.href = href
  document.head.appendChild(l)
}

// ---------------------------------------------------------------------------
// deck.gl layer helpers
// ---------------------------------------------------------------------------

function makeCellLayer(id, fc, colored, isBase) {
  if (!fc) return null
  const { GeoJsonLayer } = window.deck
  return new GeoJsonLayer({
    id,
    data: fc,
    filled: true,
    stroked: true,
    wrapLongitude: true,
    getFillColor: f => {
      if (isBase) return [0, 0, 0, 0]
      if (colored) return ylOrBrRgba(f.properties.colorValue ?? 0, 179)
      return props.fillColor
    },
    getLineColor: isBase ? [245, 158, 11, 220] : props.lineColor,
    getLineWidth: isBase ? 2 : 1,
    lineWidthUnits: 'pixels',
    pickable: !isBase && props.showControls,
    onHover: isBase || !props.showControls ? undefined : (info) => {
      if (!tooltipEl.value) return
      if (info.object) {
        tooltipEl.value.style.display = 'block'
        tooltipEl.value.style.left = `${info.x + 12}px`
        tooltipEl.value.style.top  = `${info.y + 12}px`
        tooltipEl.value.innerHTML  = `<b>Cell ID:</b> ${info.object.properties.id}`
        map.getCanvas().style.cursor = 'pointer'
      } else {
        tooltipEl.value.style.display = 'none'
        map.getCanvas().style.cursor = ''
      }
    },
    onClick: isBase || !props.showControls ? undefined : (info) => {
      if (info.object) console.log('Cell geometry:', info.object.geometry)
    },
    updateTriggers: { getFillColor: [colored] },
  })
}

function updateDeckLayers(fineFc, baseFc) {
  const colored = ctrlColorCells.value
  const layers  = []
  if (baseFc) layers.push(makeCellLayer('dggrid-base',  baseFc, false, true))
  if (fineFc) layers.push(makeCellLayer('dggrid-cells', fineFc, colored, false))
  deckOverlay.setProps({ layers })
}

// ---------------------------------------------------------------------------
// Multi-res helpers
// ---------------------------------------------------------------------------

function zoomToResolution(zoom, maxRes) {
  const res = Math.round(zoom) + ctrlZoomOffset.value
  return Math.min(maxRes, Math.max(1, res))
}

function viewportSeqNums(resolution) {
  const bounds  = map.getBounds()
  const minLat  = Math.max(bounds.getSouth(), -89)
  const maxLat  = Math.min(bounds.getNorth(),  89)
  const minLng  = bounds.getWest()
  const maxLng  = bounds.getEast()
  const steps   = 80
  const latStep = (maxLat - minLat) / steps
  const lngStep = (maxLng - minLng) / steps

  const coords = []
  for (let i = 0; i <= steps; i++)
    for (let j = 0; j <= steps; j++)
      coords.push([minLng + j * lngStep, minLat + i * latStep])

  const raw  = webdggrid.geoToSequenceNum(coords, resolution)
  const seen = new Set()
  const out  = []
  for (const n of raw) {
    const k = n.toString()
    if (!seen.has(k)) { seen.add(k); out.push(n) }
  }
  return out
}

// ---------------------------------------------------------------------------
// Main grid generation
// ---------------------------------------------------------------------------

function generateGrid() {
  if (!isReady.value || !webdggrid) return

  const maxRes     = ctrlResolution.value
  const multiRes   = ctrlMultiRes.value
  const resolution = multiRes ? zoomToResolution(map.getZoom(), maxRes) : maxRes
  const topology   = ctrlTopology.value
  const projection = ctrlProjection.value
  const aperture   = ctrlAperture.value
  const azimuth    = ctrlAzimuth.value
  const poleLng    = ctrlPoleLng.value
  const poleLat    = ctrlPoleLat.value

  webdggrid.setDggs({
    poleCoordinates: { lat: poleLat, lng: poleLng },
    azimuth, topology, projection, aperture,
  }, resolution)

  ctrlResolution.value = resolution
  status.value = 'Generating grid…'
  if (!multiRes) isGenerating.value = true

  setTimeout(() => {
    try {
      function buildFc(seqNums, res) {
        const total = webdggrid.nCells(res)
        const fc    = webdggrid.sequenceNumToGridFeatureCollection(seqNums, res)
        fc.features.forEach(f => {
          if (typeof f.id === 'bigint') f.id = f.id.toString()
          const p = f.properties
          if (p) {
            for (const k of Object.keys(p))
              if (typeof p[k] === 'bigint') p[k] = p[k].toString()
            p.colorValue = total > 1
              ? (Number(BigInt(p.id) - 1n) / (total - 1))
              : 0
          }
        })
        return processFcForGlobe(fc)
      }

      let seqNums
      let baseFc = null

      if (multiRes) {
        seqNums = viewportSeqNums(resolution)

        const baseRes = Math.max(1, resolution - 1)
        webdggrid.setDggs({
          poleCoordinates: { lat: poleLat, lng: poleLng },
          azimuth, topology, projection, aperture,
        }, baseRes)
        const baseSeqNums = viewportSeqNums(baseRes)
        baseFc = buildFc(baseSeqNums, baseRes)

        webdggrid.setDggs({
          poleCoordinates: { lat: poleLat, lng: poleLng },
          azimuth, topology, projection, aperture,
        }, resolution)
      } else {
        const total = webdggrid.nCells(resolution)
        seqNums = Array.from({ length: total }, (_, i) => BigInt(i + 1))
      }

      const fineFc = buildFc(seqNums, resolution)
      lastFineFc = fineFc
      lastBaseFc = baseFc
      updateDeckLayers(fineFc, baseFc)

      const modeLabel = multiRes ? `res ${resolution} · viewport` : `res ${resolution} · globe`
      status.value = `${seqNums.length} cells · ${modeLabel} · ${topology}`
    } catch (err) {
      const msg = (err instanceof Error && err.message) ? err.message : String(err)
      status.value = `Error: ${msg}`
      console.error(err)
    } finally {
      if (!multiRes) isGenerating.value = false
    }
  }, 20)
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

watch(ctrlTopology, (val) => {
  showAperture.value = val === 'HEXAGON'
  if (val !== 'HEXAGON') ctrlAperture.value = 4
})

watch(ctrlColorCells, () => {
  if (isReady.value) updateDeckLayers(lastFineFc, lastBaseFc)
})

watch(ctrlZoomOffset, () => {
  if (isReady.value && webdggrid) generateGrid()
})

watch([ctrlPoleLng, ctrlPoleLat], () => {
  if (poleMarker) poleMarker.setLngLat([ctrlPoleLng.value, ctrlPoleLat.value])
})

watch(ctrlMultiRes, (on) => {
  ctrlMaxResLabel.value = on ? 'Max Resolution' : 'Resolution'
  if (on) {
    ctrlResolution.value = 15
  } else {
    if (ctrlResolution.value > 5) ctrlResolution.value = 5
  }
  if (map) {
    map.off('moveend', onMoveEnd)
    if (on) map.on('moveend', onMoveEnd)
  }
  if (on && isReady.value && webdggrid) generateGrid()
})

function onMoveEnd() {
  if (!ctrlMultiRes.value || !isReady.value || !webdggrid) return
  clearTimeout(multiResTimer)
  multiResTimer = setTimeout(generateGrid, 300)
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  if (typeof window === 'undefined') return

  // Needed so BigInt properties survive JSON serialisation
  if (!BigInt.prototype.toJSON) {
    BigInt.prototype.toJSON = function () { return this.toString() }
  }

  loadLink('https://unpkg.com/maplibre-gl@5.21.1/dist/maplibre-gl.css')

  try {
    await Promise.all([
      loadScript('https://unpkg.com/maplibre-gl@5.21.1/dist/maplibre-gl.js'),
      loadScript('https://unpkg.com/deck.gl@9/dist.min.js'),
    ])

    // Use new Function to defer the import to runtime, bypassing Vite's
    // static analysis which rejects dynamic imports from /public.
    const { Webdggrid } = await new Function('return import("/dist/index.js")')()

    const isDark = document.documentElement.classList.contains('dark')

    // Read the page background colour so the sky matches the theme
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--vp-c-bg').trim() || (isDark ? '#1b1b1f' : '#ffffff')

    const noBasemapStyle = {
      version: 8,
      projection: { type: 'globe' },
      sources: {},
      layers: [],
      sky: {
        'sky-color':         isDark ? '#0b1d3a' : bgColor,
        'sky-horizon-blend':  0.5,
        'horizon-color':     isDark ? '#1a3a6e' : bgColor,
        'horizon-fog-blend':  0.3,
        'fog-color':         isDark ? '#071224' : bgColor,
        'fog-ground-blend':   0.5,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 7, 0],
      },
    }

    const basemapStyle = {
      version: 8,
      projection: { type: 'globe' },
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      sky: isDark ? {
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
      } : {
        'sky-color':        bgColor,
        'horizon-color':    bgColor,
        'fog-color':        bgColor,
        'atmosphere-blend': 0,
      },
    }

    const { Map, Marker } = window.maplibregl

    map = new Map({
      container: mapContainer.value,
      style: props.showBasemap ? basemapStyle : noBasemapStyle,
      center: props.initialCenter,
      zoom: props.initialZoom,
      interactive: props.interactive,
    })

    if (props.showControls) {
      const poleEl = document.createElement('div')
      poleEl.className = 'dggs-pole-marker'
      poleEl.innerHTML = '<div class="dggs-pole-dot"></div><div class="dggs-pole-label">Pole</div>'
      poleMarker = new Marker({ element: poleEl, anchor: 'left' })
        .setLngLat([ctrlPoleLng.value, ctrlPoleLat.value])
        .addTo(map)
    }

    deckOverlay = new window.deck.MapboxOverlay({ layers: [] })

    const [,] = await Promise.all([
      Webdggrid.load().then(w => { webdggrid = w }),
      new Promise(resolve => map.on('load', () => {
        try { map.setProjection({ type: 'globe' }) } catch (_) {}
        map.addControl(deckOverlay)
        resolve()
      })),
    ])

    isReady.value = true
    status.value = props.showControls && !props.autoGenerate
      ? 'WASM loaded — click "Generate Grid"'
      : ''

    if (props.showControls) {
      // Re-enable max-res limit after initial load
      ctrlResolution.value = props.initialResolution
    }

    if (props.autoGenerate || !props.showControls) {
      generateGrid()
    }
  } catch (err) {
    status.value = `Error: ${err.message}`
    console.error(err)
  }
})

onUnmounted(() => {
  clearTimeout(multiResTimer)
  if (map) { map.remove(); map = null }
})

// Allow parent components (e.g. DggsHeroBackground) to access the map instance.
defineExpose({ getMap: () => map })
</script>

<template>
  <div class="dggs-globe-wrap" :style="{ height }">
    <div ref="mapContainer" class="dggs-map" />
    <div ref="tooltipEl" class="dggs-tooltip" />

    <!-- Controls panel -->
    <div v-if="showControls" class="dggs-controls">
      <h3>DGGRID Grid Settings</h3>

      <div class="field">
        <label>
          {{ ctrlMaxResLabel }}
          <span>{{ ctrlResolution }}</span>
        </label>
        <input
          v-model.number="ctrlResolution"
          type="range"
          :min="1"
          :max="ctrlMultiRes ? 15 : 5"
        />
      </div>

      <h4>Grid System</h4>

      <div class="field">
        <label>Topology</label>
        <select v-model="ctrlTopology">
          <option value="HEXAGON">Hexagon</option>
          <option value="TRIANGLE">Triangle</option>
          <option value="DIAMOND">Diamond</option>
        </select>
      </div>

      <div class="field">
        <label>Projection</label>
        <select v-model="ctrlProjection">
          <option value="ISEA">ISEA</option>
          <option value="FULLER">Fuller</option>
        </select>
      </div>

      <div v-if="showAperture" class="field">
        <label>Aperture</label>
        <select v-model.number="ctrlAperture">
          <option :value="3">3</option>
          <option :value="4">4</option>
          <option :value="7">7</option>
        </select>
      </div>

      <div class="field">
        <label>Azimuth (°)</label>
        <input v-model.number="ctrlAzimuth" type="number" min="0" max="360" step="1" />
      </div>

      <h4>Pole Coordinates</h4>

      <div class="pole-row">
        <div class="field">
          <label>Longitude</label>
          <input v-model.number="ctrlPoleLng" type="number" min="-180" max="180" step="1" />
        </div>
        <div class="field">
          <label>Latitude</label>
          <input v-model.number="ctrlPoleLat" type="number" min="-90" max="90" step="1" />
        </div>
      </div>

      <h4>Display</h4>

      <label class="field-inline">
        <input v-model="ctrlMultiRes" type="checkbox" />
        Multi-resolution (viewport only)
      </label>

      <div v-if="ctrlMultiRes" class="field">
        <label>
          Zoom → Res offset
          <span>{{ ctrlZoomOffset }}</span>
        </label>
        <input v-model.number="ctrlZoomOffset" type="range" min="0" max="12" />
      </div>

      <label class="field-inline">
        <input v-model="ctrlColorCells" type="checkbox" />
        Color cells (YlOrBr)
      </label>
      <div class="ylorbr-swatch" />

      <button
        :disabled="!isReady || isGenerating"
        class="generate-btn"
        :style="{ display: ctrlMultiRes ? 'none' : '' }"
        @click="generateGrid"
      >
        {{ !isReady ? 'Loading WASM…' : isGenerating ? 'Generating…' : 'Generate Grid' }}
      </button>
    </div>

    <!-- Status bar -->
    <div v-if="status && (showControls || !isReady)" class="dggs-status">
      {{ status }}
    </div>
  </div>
</template>

<style scoped>
.dggs-globe-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.dggs-map {
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg);
}

.dggs-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.95);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #333;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
  display: none;
}

/* ---- controls panel ---- */
.dggs-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background: var(--vp-c-bg-elv);
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  width: 240px;
  max-height: calc(100% - 16px);
  overflow-y: auto;
}

.dggs-controls h3 {
  font-size: 10px;
  margin-bottom: 6px;
  color: var(--vp-c-text-2);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.dggs-controls h4 {
  font-size: 10px;
  color: var(--vp-c-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 6px 0 4px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 6px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 5px;
}

.field label {
  font-size: 11px;
  color: var(--vp-c-text-2);
  display: flex;
  justify-content: space-between;
}

.field label span { color: var(--vp-c-brand-1); font-weight: 600; }

.field input[type='range'] { width: 100%; accent-color: var(--vp-c-brand-1); }

.field input[type='number'],
.field select {
  width: 100%;
  padding: 2px 5px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  font-size: 11px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.field input[type='number']:focus,
.field select:focus { outline: none; border-color: var(--vp-c-brand-1); }

.pole-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.field-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.field-inline input[type='checkbox'] {
  width: 12px;
  height: 12px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
  flex-shrink: 0;
}

.ylorbr-swatch {
  height: 6px;
  border-radius: 3px;
  margin-top: 2px;
  background: linear-gradient(
    to right,
    #ffffe5, #fff7bc, #fee391, #fec44f,
    #fe9929, #ec7014, #cc4c02, #993404, #662506
  );
}

.generate-btn {
  width: 100%;
  padding: 5px;
  background: var(--vp-c-brand-1);
  color: var(--vp-button-brand-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  margin-top: 6px;
}

.generate-btn:hover:not(:disabled) { background: var(--vp-c-brand-2); }
.generate-btn:disabled { background: var(--vp-c-text-3); cursor: default; }

/* ---- status bar ---- */
.dggs-status {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: var(--vp-c-bg-elv);
  padding: 6px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  white-space: nowrap;
  color: var(--vp-c-text-1);
}

/* ---- pole marker (injected into MapLibre DOM) ---- */
:global(.dggs-pole-marker) {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: default;
}

:global(.dggs-pole-dot) {
  width: 11px;
  height: 11px;
  background: #e53935;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

:global(.dggs-pole-label) {
  background: rgba(255, 255, 255, 0.92);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
}
</style>
