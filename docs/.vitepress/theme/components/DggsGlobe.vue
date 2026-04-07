<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
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

// --- hierarchy selection state ---
const selectedCellId  = ref(null)
const selectedCellRes = ref(null)
const hierarchyInfo   = reactive({
  parent: null,
  children: [],
  neighbors: [],
})
const ctrlIndexType   = ref('SEQNUM')
const availableIndexTypes = computed(() => {
  const types = ['SEQNUM']
  if (ctrlTopology.value === 'HEXAGON') {
    types.push('VERTEX2DD')
    if (ctrlAperture.value !== 7) types.push('ZORDER')
    if (ctrlAperture.value === 3) types.push('Z3')
    if (ctrlAperture.value === 7) types.push('Z7')
  }
  return types
})

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
      if (info.object) {
        const cellId = info.object.properties?.id ?? info.object.id
        if (cellId != null) {
          const resolution = ctrlMultiRes.value
            ? zoomToResolution(map.getZoom(), ctrlResolution.value)
            : ctrlResolution.value
          selectCell(cellId, resolution)
        }
      }
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

  // Clear any hierarchy selection when regenerating
  selectedCellId.value = null
  selectedCellRes.value = null
  hierarchyInfo.parent = null
  hierarchyInfo.children = []
  hierarchyInfo.neighbors = []
  removeHierarchyMapLayers()

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
// Hierarchy selection
// ---------------------------------------------------------------------------

function getCellIndexLabel(seqnum, resolution) {
  try {
    switch (ctrlIndexType.value) {
      case 'SEQNUM': return seqnum.toString()
      case 'VERTEX2DD': {
        const v = webdggrid.sequenceNumToVertex2DD(seqnum, resolution)
        return `v${v.vertNum} t${v.triNum}`
      }
      case 'ZORDER': return webdggrid.sequenceNumToZOrder(seqnum, resolution).toString()
      case 'Z3': return webdggrid.sequenceNumToZ3(seqnum, resolution).toString()
      case 'Z7': return webdggrid.sequenceNumToZ7(seqnum, resolution).toString()
      default: return seqnum.toString()
    }
  } catch {
    return seqnum.toString()
  }
}

function selectCell(cellId, resolution) {
  if (!webdggrid) return

  const seqnum = typeof cellId === 'bigint' ? cellId : BigInt(cellId)
  selectedCellId.value = seqnum
  selectedCellRes.value = resolution

  // Get hierarchical relationships
  try {
    hierarchyInfo.neighbors = webdggrid.sequenceNumNeighbors([seqnum], resolution)[0]
  } catch { hierarchyInfo.neighbors = [] }
  try {
    hierarchyInfo.parent = resolution > 0 ? webdggrid.sequenceNumParent([seqnum], resolution)[0] : null
  } catch { hierarchyInfo.parent = null }
  try {
    hierarchyInfo.children = webdggrid.sequenceNumChildren([seqnum], resolution)[0]
  } catch { hierarchyInfo.children = [] }

  updateHierarchyLayers(seqnum, resolution)
}

function clearSelection() {
  selectedCellId.value = null
  selectedCellRes.value = null
  hierarchyInfo.parent = null
  hierarchyInfo.children = []
  hierarchyInfo.neighbors = []
  removeHierarchyMapLayers()
}

// MapLibre source/layer IDs for hierarchy
const HIER_SOURCES = ['hier-parent', 'hier-children', 'hier-selected', 'hier-labels-selected', 'hier-labels-parent', 'hier-labels-children']

function removeHierarchyMapLayers() {
  if (!map) return
  for (const id of HIER_SOURCES) {
    for (const suffix of ['-fill', '-line', '-text']) {
      if (map.getLayer(id + suffix)) map.removeLayer(id + suffix)
    }
    if (map.getSource(id)) map.removeSource(id)
  }
}

function sanitizeFc(fc) {
  fc.features.forEach(f => {
    if (typeof f.id === 'bigint') f.id = f.id.toString()
    if (f.properties) {
      for (const k of Object.keys(f.properties)) {
        if (typeof f.properties[k] === 'bigint') f.properties[k] = f.properties[k].toString()
      }
    }
  })
  return fc
}

function updateHierarchyLayers(seqnum, resolution) {
  if (!map) return

  // Restore base deck.gl grid layers
  if (deckOverlay && lastFineFc) {
    updateDeckLayers(lastFineFc, lastBaseFc)
  }

  // Remove previous MapLibre hierarchy layers
  removeHierarchyMapLayers()

  // --- Parent polygon ---
  if (hierarchyInfo.parent !== null && resolution > 0) {
    try {
      const parentFc = sanitizeFc(webdggrid.sequenceNumToGridFeatureCollection([hierarchyInfo.parent], resolution - 1))
      console.log('Parent cell geometry:', JSON.stringify(parentFc.features[0]?.geometry))
      map.addSource('hier-parent', { type: 'geojson', data: parentFc })
      map.addLayer({ id: 'hier-parent-fill', type: 'fill', source: 'hier-parent', paint: { 'fill-color': '#33cc33', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'hier-parent-line', type: 'line', source: 'hier-parent', paint: { 'line-color': '#33cc33', 'line-width': 3, 'line-dasharray': [3, 2] } })

      // Parent label — offset upward so it doesn't overlap selected cell
      const geo = webdggrid.sequenceNumToGeo([hierarchyInfo.parent], resolution - 1)[0]
      const parentLabelFc = { type: 'FeatureCollection', features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [geo[0], geo[1]] },
        properties: { label: getCellIndexLabel(hierarchyInfo.parent, resolution - 1) },
      }] }
      map.addSource('hier-labels-parent', { type: 'geojson', data: parentLabelFc })
      map.addLayer({
        id: 'hier-labels-parent-text',
        type: 'symbol',
        source: 'hier-labels-parent',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-offset': [0, -2],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#1a8a1a', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 },
      })
    } catch (err) { console.error('Parent geometry error:', err) }
  }

  // --- Children polygons ---
  if (hierarchyInfo.children.length > 0) {
    try {
      const childFc = sanitizeFc(webdggrid.sequenceNumToGridFeatureCollection(hierarchyInfo.children, resolution + 1))
      map.addSource('hier-children', { type: 'geojson', data: childFc })
      map.addLayer({ id: 'hier-children-fill', type: 'fill', source: 'hier-children', paint: { 'fill-color': '#ffcc00', 'fill-opacity': 0.3 } })
      map.addLayer({ id: 'hier-children-line', type: 'line', source: 'hier-children', paint: { 'line-color': '#cc9900', 'line-width': 2 } })

      // Children labels — collision detection auto-hides overlapping ones
      const childLabelFeatures = []
      for (const child of hierarchyInfo.children) {
        try {
          const geo = webdggrid.sequenceNumToGeo([child], resolution + 1)[0]
          childLabelFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [geo[0], geo[1]] },
            properties: { label: getCellIndexLabel(child, resolution + 1) },
          })
        } catch { /* skip */ }
      }
      if (childLabelFeatures.length > 0) {
        const childLabelFc = { type: 'FeatureCollection', features: childLabelFeatures }
        map.addSource('hier-labels-children', { type: 'geojson', data: childLabelFc })
        map.addLayer({
          id: 'hier-labels-children-text',
          type: 'symbol',
          source: 'hier-labels-children',
          layout: {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
            'text-allow-overlap': false,
            'text-optional': true,
          },
          paint: { 'text-color': '#886600', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.5 },
        })
      }
    } catch { /* skip */ }
  }

  // --- Selected cell highlight (always on top) ---
  try {
    const centerFc = sanitizeFc(webdggrid.sequenceNumToGridFeatureCollection([seqnum], resolution))
    map.addSource('hier-selected', { type: 'geojson', data: centerFc })
    map.addLayer({ id: 'hier-selected-fill', type: 'fill', source: 'hier-selected', paint: { 'fill-color': '#ff3333', 'fill-opacity': 0.25 } })
    map.addLayer({ id: 'hier-selected-line', type: 'line', source: 'hier-selected', paint: { 'line-color': '#ff3333', 'line-width': 4 } })

    // Selected label — always visible, ignores collisions
    const geo = webdggrid.sequenceNumToGeo([seqnum], resolution)[0]
    const selLabelFc = { type: 'FeatureCollection', features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [geo[0], geo[1]] },
      properties: { label: getCellIndexLabel(seqnum, resolution) },
    }] }
    map.addSource('hier-labels-selected', { type: 'geojson', data: selLabelFc })
    map.addLayer({
      id: 'hier-labels-selected-text',
      type: 'symbol',
      source: 'hier-labels-selected',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ff3333', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2.5 },
    })
  } catch { /* skip */ }
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

    const { Webdggrid } = await import('webdggrid')

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

    <!-- Cell Hierarchy panel (top-left) -->
    <div v-if="showControls" class="dggs-hierarchy">
      <h3>Cell Hierarchy</h3>

      <div class="field">
        <label>Index Type</label>
        <select v-model="ctrlIndexType" @change="selectedCellId && selectCell(selectedCellId, selectedCellRes)">
          <option v-for="t in availableIndexTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <template v-if="selectedCellId">
        <div class="hier-cell-id">
          Selected: <strong>{{ selectedCellId.toString() }}</strong>
          <span class="hier-res">res {{ selectedCellRes }}</span>
          <button class="hier-clear-btn" @click="clearSelection">Clear</button>
        </div>

        <div v-if="hierarchyInfo.parent !== null" class="hier-group">
          <div class="hier-label hier-parent-label">Parent (res {{ selectedCellRes - 1 }})</div>
          <div class="hier-value">{{ hierarchyInfo.parent.toString() }}</div>
        </div>

        <div v-if="hierarchyInfo.children.length" class="hier-group">
          <div class="hier-label hier-child-label">Children ({{ hierarchyInfo.children.length }}, res {{ selectedCellRes + 1 }})</div>
          <div class="hier-chips">
            <span v-for="(c, i) in hierarchyInfo.children" :key="i" class="hier-chip hier-chip-child">{{ c.toString() }}</span>
          </div>
        </div>

        <div v-if="hierarchyInfo.neighbors.length" class="hier-group">
          <div class="hier-label hier-neighbor-label">Neighbors ({{ hierarchyInfo.neighbors.length }})</div>
          <div class="hier-chips">
            <span v-for="(n, i) in hierarchyInfo.neighbors" :key="i" class="hier-chip hier-chip-neighbor">{{ n.toString() }}</span>
          </div>
        </div>
      </template>
      <div v-else class="hier-hint">Click a cell on the map to inspect hierarchy</div>
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

/* ---- hierarchy panel (top-left) ---- */
.dggs-hierarchy {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: var(--vp-c-bg-elv);
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  width: 260px;
  max-height: calc(100% - 16px);
  overflow-y: auto;
}
.dggs-hierarchy h3 {
  font-size: 10px;
  margin-bottom: 6px;
  color: var(--vp-c-text-2);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.dggs-hierarchy .field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 5px;
}
.dggs-hierarchy .field label {
  font-size: 11px;
  color: var(--vp-c-text-2);
}
.dggs-hierarchy .field select {
  width: 100%;
  padding: 2px 5px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  font-size: 11px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
.hier-cell-id {
  font-size: 11px;
  color: var(--vp-c-text-1);
  margin-bottom: 6px;
  word-break: break-all;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.hier-res {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  padding: 0 4px;
  border-radius: 3px;
  font-size: 10px;
  margin-left: 4px;
}
.hier-clear-btn {
  font-size: 10px;
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  margin-left: auto;
}
.hier-clear-btn:hover { background: var(--vp-c-default-soft); }
.hier-group {
  margin-bottom: 5px;
}
.hier-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
}
.hier-parent-label { color: #33cc33; }
.hier-child-label { color: #cc9900; }
.hier-neighbor-label { color: #3399ff; }
.hier-value {
  font-size: 11px;
  font-family: monospace;
  color: var(--vp-c-text-1);
  word-break: break-all;
}
.hier-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.hier-chip {
  font-size: 10px;
  font-family: monospace;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  word-break: break-all;
}
.hier-chip-child { border-left: 2px solid #ffcc00; }
.hier-chip-neighbor { border-left: 2px solid #3399ff; }
.hier-hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin-top: 2px;
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
