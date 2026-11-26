<script setup>
// Live demo rendered with Navara (https://github.com/maplibre/navara), a
// MapLibre-family 3D globe engine. Same grid controls and hierarchy panel as
// DggsGlobe.vue (Cesium); adds Navara's physically based sky, sun, stars and
// atmosphere.
//
// Cells are drawn on Navara's 3D (non-draped) polygon path: it triangulates
// each ring on a tangent plane, so cells that wind around a pole or have an
// edge over it render correctly. The draped (clampToGround) path goes through
// a Web Mercator tiler and breaks at the poles, so it is never used here.
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ylOrBrRgba } from '../utils/globeUtils.js'
import { loadWebdggrid } from '../utils/loadWebdggrid.js'
import {
  PRESETS, PROJECTIONS, DATUMS, CELL_STYLE, indexTypesFor, indexLabel,
  WORLD, padExtent, extentContains, extentSeqNums,
} from '../utils/demoGrid.js'

const props = defineProps({
  /** Show the controls panels */
  showControls: { type: Boolean, default: true },
  /** CSS height of the map container */
  height: { type: String, default: '100vh' },
  /** Generate grid immediately on load */
  autoGenerate: { type: Boolean, default: true },
  initialResolution: { type: Number, default: 3 },
  /** Start in multi-resolution mode: cells for the viewport, refined as you zoom */
  initialMultiRes: { type: Boolean, default: true },
  /** Zoom → resolution offset used in multi-resolution mode */
  initialZoomOffset: { type: Number, default: 1 },
  initialTopology: { type: String, default: 'HEXAGON' },
  initialProjection: { type: String, default: 'ISEA' },
  initialAperture: { type: Number, default: 4 },
  initialAzimuth: { type: Number, default: 0 },
  initialPoleLng: { type: Number, default: 0 },
  initialPoleLat: { type: Number, default: 0 },
  initialCenter: { type: Array, default: () => [10, 25] },
  /** MapLibre-style globe zoom, mapped to a camera height */
  initialZoom: { type: Number, default: 1.5 },
})

// --- template refs ---
const mapContainer = ref(null)
const tooltipEl    = ref(null)

// --- reactive control state ---
const status       = ref('Loading WASM and globe…')
const isReady      = ref(false)
const isGenerating = ref(false)

// in multi-resolution mode the slider is the maximum resolution
const ctrlResolution    = ref(props.initialMultiRes ? 15 : props.initialResolution)
const ctrlTopology      = ref(props.initialTopology)
const ctrlProjection    = ref(props.initialProjection)
const ctrlAperture      = ref(props.initialAperture)
const ctrlAzimuth       = ref(props.initialAzimuth)
const ctrlPoleLng       = ref(props.initialPoleLng)
const ctrlPoleLat       = ref(props.initialPoleLat)
const ctrlColorCells    = ref(false)
const ctrlMultiRes      = ref(props.initialMultiRes)
const ctrlZoomOffset    = ref(props.initialZoomOffset)
const ctrlMixedAperture = ref(false)
const ctrlApertureSeq   = ref('434747')
const ctrlDatum         = ref('AUTHALIC_SPHERE')
const ctrlPreset        = ref('custom')
const showAperture      = computed(() => ctrlTopology.value === 'HEXAGON')
const ctrlMaxResLabel   = computed(() => ctrlMultiRes.value ? 'Max Resolution' : 'Resolution')

// --- scene state ---
const ctrlSky       = ref(true)
const ctrlTerrain   = ref(false)
const ctrlBasemap   = ref('satellite')
const ctrlSunHour   = ref(15.5) // UTC hour on the March equinox: terminator in view
const ctrlOpacity   = ref(0.3)
const ctrlCellsLit  = ref(true)

// --- small screens: the panels become bottom sheets opened from a toolbar ---
const isMobile  = ref(false)
const openSheet = ref(null)   // 'settings' | 'hierarchy' | null
const isTouch   = ref(false)
let mobileQuery = null
const onMobileChange = (e) => {
  isMobile.value = e.matches
  if (!e.matches) openSheet.value = null
}
function toggleSheet(name) {
  openSheet.value = openSheet.value === name ? null : name
}
// a hover tooltip left over from before the sheet opened would sit on top of it
watch(openSheet, (v) => { if (v && tooltipEl.value) tooltipEl.value.style.display = 'none' })

// --- hierarchy selection state ---
const selectedCellId  = ref(null)
const selectedCellRes = ref(null)
const hierarchyInfo   = reactive({ parent: null, allParents: [], children: [], neighbors: [] })
const ctrlIndexType   = ref('SEQNUM')
const availableIndexTypes = computed(() => indexTypesFor({
  topology: ctrlTopology.value,
  aperture: ctrlAperture.value,
  mixed: ctrlMixedAperture.value && showAperture.value,
}))
watch(availableIndexTypes, (types) => {
  if (!types.includes(ctrlIndexType.value)) ctrlIndexType.value = 'SEQNUM'
})

// --- DGGRID presets: fill in the grid settings; editing any of them again
// makes the selection "Custom" ---
let applyingPreset = false
watch(ctrlPreset, (name) => {
  const p = PRESETS.find((x) => x.name === name)
  if (!p) return
  applyingPreset = true
  ctrlTopology.value = p.topology
  ctrlProjection.value = p.projection
  ctrlAperture.value = p.aperture
  ctrlAzimuth.value = Math.round(p.azimuth * 1e4) / 1e4
  ctrlPoleLat.value = Math.round(p.poleCoordinates.lat * 1e4) / 1e4
  ctrlPoleLng.value = Math.round(p.poleCoordinates.lng * 1e4) / 1e4
  ctrlDatum.value = p.datum
  ctrlMixedAperture.value = !!p.apertureSequence
  if (p.apertureSequence) ctrlApertureSeq.value = p.apertureSequence
  nextTick(() => { applyingPreset = false })
})
watch([ctrlTopology, ctrlProjection, ctrlAperture, ctrlAzimuth, ctrlPoleLat, ctrlPoleLng, ctrlDatum, ctrlMixedAperture, ctrlApertureSeq], () => {
  if (!applyingPreset) ctrlPreset.value = 'custom'
})

// --- non-reactive engine state ---
let N = null              // the @navaramap/three module
let view = null
let photoreal = null      // handles from addDefaultPhotorealScene
let basemap = null        // { layer, source }
let terrain = null        // { layer, source }
let webdggrid = null
const layers = {}         // key -> { layer, source }
let gridLayerId = null
let lastFine = null, lastBase = null
let multiResTimer = null, settingsTimer = null
let fontReady = false
let pointerXY = [0, 0]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const color = (css) => new N.Color().setStyle(css)
const rgbCss = ([r, g, b]) => `rgb(${r},${g},${b})`

// Height above the ellipsoid the cells float at: clear of the terrain when
// relief is on, and stacked per layer so outlines never z-fight.
function layerHeight(level) {
  return (ctrlTerrain.value ? 9000 : 0) + 1500 + level * 1500
}

function altitudeFromZoom(zoom) { return 40_000_000 * Math.pow(2, -zoom) }
// The zoom levels assume a landscape view; on a portrait screen the globe is
// limited by the width, so move the camera back until it fits.
function fitAltitude(zoom) {
  const el = mapContainer.value
  const aspect = el && el.clientHeight ? el.clientWidth / el.clientHeight : 1
  return altitudeFromZoom(zoom) / Math.min(1, aspect * 1.15)
}
function zoomFromAltitude() {
  const h = view?.camera.positionGeographic.height ?? 1
  return Math.log2(40_000_000 / Math.max(h, 1))
}

function dropLayer(key) {
  const l = layers[key]
  if (!l) return
  l.layer.delete()
  l.source.delete()
  delete layers[key]
}

function addGeoJson(key, features, layerConfig, evaluate) {
  // add the new layer before removing the old one, so a regenerated layer
  // never blinks out
  const old = layers[key]
  delete layers[key]
  const dropOld = () => { if (old) { old.layer.delete(); old.source.delete() } }
  if (!features.length) { dropOld(); return null }
  const source = view.addSource({ type: 'geojson', data: { type: 'FeatureCollection', features } })
  const layer = view.addLayer({ type: 'vector', source, ...layerConfig })
  if (evaluate) {
    const seen = new Set()
    layer.on('featureUpdated', ({ evaluator }) => {
      if (seen.has(evaluator.id)) return
      seen.add(evaluator.id)
      evaluator.evaluate(evaluate.fn, { filters: evaluate.filters })
    })
  }
  layers[key] = { layer, source }
  dropOld()
  return layer
}

// 3D (non-draped) polygon material: correct over the poles, with outlines.
function polygonMaterial({ fill, opacity, outline, outlineWidth, surface = true, level }) {
  return {
    color: color(fill),
    transparent: true,
    opacity,
    surfaceShow: surface,
    outlineShow: true,
    outlineColor: color(outline),
    outlineWidth,
    clampToGround: false,
    tiled: false,
    height: layerHeight(level),
    // lit: cells darken on the night side with the globe; unlit: flat colors
    lit: ctrlCellsLit.value && ctrlSky.value,
  }
}

// Navara serialises feature properties, so make them JSON-safe.
function cellFeatures(seqNums, res, extra) {
  const total = webdggrid.nCells(res)
  const rings = webdggrid.sequenceNumToGrid(seqNums, res, { unwrap: false })
  return rings.map((ring, i) => ({
    type: 'Feature',
    properties: {
      id: seqNums[i].toString(),
      res,
      colorValue: total > 1 ? Number(seqNums[i] - 1n) / (total - 1) : 0,
      ...(extra?.(seqNums[i], i) ?? {}),
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  }))
}

function labelFeatures(items) {
  return items.map(({ seqnum, res, label, kind }) => {
    const [lng, lat] = webdggrid.sequenceNumToGeo([seqnum], res)[0]
    return { type: 'Feature', properties: { label, kind }, geometry: { type: 'Point', coordinates: [lng, lat] } }
  })
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const BASEMAPS = {
  satellite: {
    url: 'https://tiles.maps.eox.at/wmts?layer=s2cloudless-2020_3857&style=default' +
      '&tilematrixset=g&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg' +
      '&TileMatrix={z}&TileCol={x}&TileRow={y}',
    maxZoom: 15,
  },
  osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19 },
}

function applyBasemap() {
  if (basemap) { basemap.layer.delete(); basemap.source.delete(); basemap = null }
  const cfg = BASEMAPS[ctrlBasemap.value]
  if (!cfg) return
  const source = view.addSource({ type: 'raster-tile', ...cfg })
  const layer = view.addLayer({ type: 'raster', source })
  basemap = { layer, source }
}

function applyTerrain() {
  if (terrain) { terrain.layer.delete(); terrain.source.delete(); terrain = null }
  if (ctrlTerrain.value) {
    const source = view.addSource({
      type: 'quantized-mesh',
      url: 'https://terrain.reearth.land/cesium-mesh/ellipsoid/{z}/{x}/{y}.terrain',
      maxZoom: 18,
      requestVertexNormals: true,
      requestWaterMask: true,
    })
    const layer = view.addLayer({ type: 'terrain', source, terrain: {} })
    terrain = { layer, source }
  }
  // imagery drapes over the terrain added before it
  applyBasemap()
}

function applySky() {
  if (photoreal) {
    for (const h of Object.values(photoreal)) h?.delete()
    photoreal = null
  }
  if (ctrlSky.value) {
    photoreal = defaultPlugin.addDefaultPhotorealScene()
    // the default exposure leaves the imagery dim at globe scale
    view.toneMappingExposure = 1.8
  } else {
    view.globe.color = color(readThemeBg())
  }
}

function applySun() {
  const h = ctrlSunHour.value
  view.atmosphere.date = new Date(Date.UTC(2026, 2, 20, Math.floor(h), Math.round((h % 1) * 60)))
}

function readThemeBg() {
  const css = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-bg').trim()
  return css || (document.documentElement.classList.contains('dark') ? '#1b1b1f' : '#ffffff')
}

let defaultPlugin = null

// ---------------------------------------------------------------------------
// Grid layers
// ---------------------------------------------------------------------------

function drawGrid(fine, base) {
  dropLayer('grid')
  dropLayer('base')
  if (base) {
    addGeoJson('base', base, {
      polygon: polygonMaterial({ fill: '#000000', opacity: 0, outline: '#f59e0b', outlineWidth: 3, surface: false, level: 0 }),
    })
  }
  if (fine) {
    const colored = ctrlColorCells.value
    const layer = addGeoJson('grid', fine, {
      polygon: polygonMaterial({
        fill: '#3884ff', opacity: colored ? Math.min(1, ctrlOpacity.value + 0.35) : ctrlOpacity.value,
        outline: colored ? '#5c3a12' : '#8ec5ff', outlineWidth: 1.5, level: 1,
      }),
    }, colored ? {
      fn: ({ properties }) => ({ color: color(rgbCss(ylOrBrRgba(Number(properties?.colorValue ?? 0), 255))) }),
      filters: ['colorValue'],
    } : null)
    gridLayerId = layer?.id ?? null
  }
}

function drawPole() {
  addGeoJson('pole', [{
    type: 'Feature',
    properties: { label: 'Pole' },
    geometry: { type: 'Point', coordinates: [ctrlPoleLng.value, ctrlPoleLat.value] },
  }], {
    point: { color: color('#e53935'), size: 11, sizeInMeters: false, height: layerHeight(6), declutter: false },
    ...(fontReady ? {
      text: {
        font: 'Inter', size: 13, sizeInMeters: false, textFacing: 'upright', color: color('#ffffff'), outlineColor: color('#000000'), outlineWidth: 10,
        anchor: 'left', offset: { x: 1, y: 0 }, height: layerHeight(6), declutter: false,
      },
    } : {}),
  }, fontReady ? { fn: ({ properties }) => ({ text: String(properties?.label ?? ''), show: true }), filters: ['label'] } : null)
}

// ---------------------------------------------------------------------------
// Multi-res helpers
// ---------------------------------------------------------------------------

function zoomToResolution(zoom, maxRes) {
  return Math.min(maxRes, Math.max(1, Math.round(zoom) + ctrlZoomOffset.value))
}

// Navara has no "view rectangle" call, so sample the canvas: pick the globe
// under a grid of screen points and take their lat/lng extent.
function viewportExtent() {
  const rect = view.canvas.getBoundingClientRect()
  const lats = [], lngs = []
  const S = 16
  for (let i = 0; i <= S; i++) {
    for (let j = 0; j <= S; j++) {
      const p = view.pickTerrainPosition(rect.left + rect.width * j / S, rect.top + rect.height * i / S)
      if (!p) continue
      const g = N.vector3ToGeodetic(p)
      lats.push(g.lat); lngs.push(g.lng)
    }
  }
  if (lats.length < 6) return null
  let minLat = Math.min(...lats), maxLat = Math.max(...lats)
  // a visible pole: every longitude is in view
  if (maxLat > 70 || minLat < -70) {
    return { minLng: -180, maxLng: 180, minLat: Math.max(-89.9, minLat - 2), maxLat: Math.min(89.9, maxLat + 2) }
  }
  // longitude range = the circle minus its largest gap between samples
  const sorted = [...new Set(lngs.map((l) => Math.round(l * 1000) / 1000))].sort((a, b) => a - b)
  let gap = sorted[0] + 360 - sorted[sorted.length - 1], start = sorted[0]
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k] - sorted[k - 1] > gap) { gap = sorted[k] - sorted[k - 1]; start = sorted[k] }
  }
  const span = 360 - gap
  const pad = Math.max(1, span * 0.1)
  return {
    minLng: start - pad, maxLng: start + span + pad,
    minLat: Math.max(-89.9, minLat - pad), maxLat: Math.min(89.9, maxLat + pad),
  }
}

// What the current cells were generated for; a camera move only regenerates
// when the resolution changes or the view leaves the (padded) area covered.
let lastGen = null   // { res, extent, cfgKey }
const MULTIRES_PAD = 0.5

function cfgKey() { return JSON.stringify(dggsConfig()) }

// ---------------------------------------------------------------------------
// Main grid generation
// ---------------------------------------------------------------------------

function dggsConfig() {
  const cfg = {
    poleCoordinates: { lat: ctrlPoleLat.value, lng: ctrlPoleLng.value },
    azimuth: ctrlAzimuth.value,
    topology: ctrlTopology.value,
    projection: ctrlProjection.value,
    aperture: ctrlAperture.value,
    datum: ctrlDatum.value,
  }
  if (ctrlMixedAperture.value && showAperture.value) cfg.apertureSequence = ctrlApertureSeq.value
  return cfg
}

function currentResolution() {
  const isMixed = ctrlMixedAperture.value && showAperture.value
  const cap = isMixed ? Math.min(ctrlResolution.value, ctrlApertureSeq.value.length) : ctrlResolution.value
  return ctrlMultiRes.value
    ? zoomToResolution(zoomFromAltitude(), isMixed ? ctrlApertureSeq.value.length : ctrlResolution.value)
    : cap
}

// keepSelection: a camera-driven refresh keeps the selected cell and its
// hierarchy; a settings change starts over.
function generateGrid({ keepSelection = false } = {}) {
  if (!isReady.value || !webdggrid) return
  if (!keepSelection) clearSelection()
  if (tooltipEl.value) tooltipEl.value.style.display = 'none'

  const multiRes = ctrlMultiRes.value
  const resolution = currentResolution()
  const cfg = dggsConfig()
  if (!multiRes) isGenerating.value = true
  status.value = 'Generating grid…'

  setTimeout(() => {
    try {
      webdggrid.setDggs(cfg, resolution)
      let seqNums, base = null
      if (multiRes) {
        // cover more than the viewport, so small pans need no new cells
        const visible = viewportExtent()
        const extent = visible ? padExtent(visible, MULTIRES_PAD) : WORLD
        const steps = visible ? Math.round(90 * (1 + 2 * MULTIRES_PAD)) : 120
        seqNums = extentSeqNums(webdggrid, resolution, extent, steps)
        const baseRes = Math.max(1, resolution - 1)
        webdggrid.setDggs(cfg, baseRes)
        base = cellFeatures(extentSeqNums(webdggrid, baseRes, extent, steps), baseRes)
        webdggrid.setDggs(cfg, resolution)
        lastGen = { res: resolution, extent, cfgKey: JSON.stringify(cfg) }
      } else {
        lastGen = null
        const total = webdggrid.nCells(resolution)
        if (total > MAX_GLOBE_CELLS) throw new Error(`${total} cells — lower the resolution or use multi-resolution`)
        seqNums = Array.from({ length: total }, (_, i) => BigInt(i + 1))
      }
      const fine = cellFeatures(seqNums, resolution)
      lastFine = fine; lastBase = base
      drawGrid(fine, base)
      drawPole()
      // keep the selection drawn above the new grid
      if (keepSelection && selectedCellId.value) drawHierarchy(selectedCellId.value, selectedCellRes.value)
      const apLabel = cfg.apertureSequence ? `mixed [${cfg.apertureSequence}]` : `${ctrlProjection.value} ${ctrlTopology.value.toLowerCase()} a${ctrlAperture.value}`
      status.value = `${seqNums.length} cells · res ${resolution} · ${multiRes ? 'viewport' : 'globe'} · ${apLabel}`
    } catch (err) {
      status.value = `Error: ${err?.message ?? err}`
      console.error(err)
    } finally {
      isGenerating.value = false
    }
  }, 20)
}

// ---------------------------------------------------------------------------
// Hierarchy selection
// ---------------------------------------------------------------------------

function getCellIndexLabel(seqnum, resolution) {
  return indexLabel(webdggrid, ctrlIndexType.value, seqnum, resolution)
}

function selectCell(cellId, resolution) {
  if (!webdggrid) return
  const seqnum = BigInt(cellId)
  webdggrid.setDggs(dggsConfig(), resolution)
  selectedCellId.value = seqnum
  selectedCellRes.value = resolution
  if (isMobile.value) openSheet.value = 'hierarchy'
  try { hierarchyInfo.neighbors = webdggrid.sequenceNumNeighbors([seqnum], resolution)[0] } catch { hierarchyInfo.neighbors = [] }
  try {
    hierarchyInfo.allParents = resolution > 0 ? webdggrid.sequenceNumAllParents([seqnum], resolution)[0] : []
    hierarchyInfo.parent = hierarchyInfo.allParents[0] ?? null
  } catch { hierarchyInfo.parent = null; hierarchyInfo.allParents = [] }
  try { hierarchyInfo.children = webdggrid.sequenceNumChildren([seqnum], resolution)[0] } catch { hierarchyInfo.children = [] }
  drawHierarchy(seqnum, resolution)
}

function clearSelection() {
  selectedCellId.value = null
  selectedCellRes.value = null
  hierarchyInfo.parent = null
  hierarchyInfo.allParents = []
  hierarchyInfo.children = []
  hierarchyInfo.neighbors = []
  for (const k of ['parents', 'parentPrimary', 'children', 'selected', 'labels']) dropLayer(k)
}

function drawHierarchy(seqnum, res) {
  for (const k of ['parents', 'parentPrimary', 'children', 'selected', 'labels']) dropLayer(k)
  const labels = []

  if (hierarchyInfo.allParents.length && res > 0) {
    const [primary, ...others] = hierarchyInfo.allParents
    addGeoJson('parents', cellFeatures(others, res - 1), {
      polygon: polygonMaterial({ fill: '#66dd88', opacity: 0.25, outline: '#44bb66', outlineWidth: 2.5, level: 2 }),
    })
    addGeoJson('parentPrimary', cellFeatures([primary], res - 1), {
      polygon: polygonMaterial({ fill: '#22cc55', opacity: 0.35, outline: '#11aa33', outlineWidth: 3.5, level: 3 }),
    })
    hierarchyInfo.allParents.forEach((p) => labels.push({ seqnum: p, res: res - 1, label: getCellIndexLabel(p, res - 1), kind: 'parent' }))
  }
  if (hierarchyInfo.children.length) {
    addGeoJson('children', cellFeatures(hierarchyInfo.children, res + 1), {
      polygon: polygonMaterial({ fill: '#ffcc00', opacity: 0.3, outline: '#cc9900', outlineWidth: 2, level: 4 }),
    })
    hierarchyInfo.children.forEach((c) => labels.push({ seqnum: c, res: res + 1, label: getCellIndexLabel(c, res + 1), kind: 'child' }))
  }
  addGeoJson('selected', cellFeatures([seqnum], res), {
    polygon: polygonMaterial({ fill: '#ff3333', opacity: 0.25, outline: '#ff3333', outlineWidth: 4, level: 5 }),
  })
  labels.push({ seqnum, res, label: getCellIndexLabel(seqnum, res), kind: 'selected' })

  if (fontReady) {
    const LABEL_COLORS = { parent: '#7CFC8A', child: '#ffd84d', selected: '#ff6b6b' }
    addGeoJson('labels', labelFeatures(labels), {
      text: {
        font: 'Inter', size: 12, sizeInMeters: false, textFacing: 'upright', color: color('#ffffff'),
        outlineColor: color('#000000'), outlineWidth: 12,
        height: layerHeight(6), declutter: true,
      },
    }, {
      fn: ({ properties }) => ({
        text: String(properties?.label ?? ''),
        show: true,
        color: color(LABEL_COLORS[properties?.kind] ?? '#ffffff'),
        declutterPriority: properties?.kind === 'selected' ? 10 : properties?.kind === 'parent' ? 5 : 1,
      }),
      filters: ['label', 'kind'],
    })
  }
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

watch(ctrlTopology, (val) => {
  if (val !== 'HEXAGON') {
    ctrlAperture.value = 4
    ctrlMixedAperture.value = false
  }
})
watch(ctrlColorCells, () => { if (isReady.value) drawGrid(lastFine, lastBase) })
watch(ctrlOpacity, () => { if (isReady.value) drawGrid(lastFine, lastBase) })
watch(ctrlCellsLit, () => { if (isReady.value) redrawAll() })
watch(ctrlZoomOffset, () => { if (isReady.value) generateGrid() })
watch([ctrlPoleLng, ctrlPoleLat], () => { if (isReady.value) drawPole() })
watch(ctrlIndexType, () => { if (selectedCellId.value) selectCell(selectedCellId.value, selectedCellRes.value) })

// In multi-res mode there is no Generate button, so settings regenerate.
watch(
  [ctrlResolution, ctrlTopology, ctrlProjection, ctrlAperture, ctrlAzimuth, ctrlPoleLng, ctrlPoleLat, ctrlMixedAperture, ctrlApertureSeq, ctrlDatum],
  () => {
    if (!ctrlMultiRes.value || !isReady.value) return
    clearTimeout(settingsTimer)
    settingsTimer = setTimeout(generateGrid, 150)
  },
)
const MAX_GLOBE_CELLS = 60000
watch(ctrlMultiRes, (on) => {
  if (on) {
    ctrlResolution.value = 15
  } else if (webdggrid) {
    // the highest resolution up to 5 whose whole-globe grid stays drawable
    let r = Math.min(ctrlResolution.value, 5)
    while (r > 1 && webdggrid.nCells(r) > MAX_GLOBE_CELLS) r--
    ctrlResolution.value = r
  }
  if (isReady.value) generateGrid()
})

watch(ctrlSky, () => {
  if (!view) return
  applySky()
  redrawAll()
})
watch(ctrlBasemap, () => { if (view) applyBasemap() })
watch(ctrlSunHour, () => { if (view) applySun() })
watch(ctrlTerrain, () => {
  if (!view) return
  applyTerrain()
  redrawAll()   // cells float higher with relief on
})

function redrawAll() {
  drawGrid(lastFine, lastBase)
  drawPole()
  if (selectedCellId.value) selectCell(selectedCellId.value, selectedCellRes.value)
}

function onMoveEnd() {
  if (!ctrlMultiRes.value || !isReady.value) return
  clearTimeout(multiResTimer)
  multiResTimer = setTimeout(() => {
    const visible = viewportExtent()
    const stillCovered = lastGen
      && lastGen.res === currentResolution()
      && lastGen.cfgKey === cfgKey()
      && visible && extentContains(lastGen.extent, visible)
    if (!stillCovered) generateGrid({ keepSelection: true })
  }, 300)
}

function flyTo(lng, lat, zoom) {
  view?.flyTo({ lng, lat, height: fitAltitude(zoom), heading: 0, pitch: -90, roll: 0 }, { duration: 1800 })
  if (isMobile.value) openSheet.value = null
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  if (typeof window === 'undefined') return
  mobileQuery = window.matchMedia('(max-width: 768px)')
  onMobileChange(mobileQuery)
  mobileQuery.addEventListener('change', onMobileChange)
  isTouch.value = window.matchMedia('(hover: none)').matches
  try {
    // client-only: Navara touches WebGL, workers and WASM on import
    const [nav, pluginMod, Webdggrid] = await Promise.all([
      import('@navaramap/three'),
      import('@navaramap/three-default-plugin'),
      loadWebdggrid(),
    ])
    N = nav
    // useNormal (init-only) gives the bare globe normals, so the sun shades
    // it: a day side, a night side and the atmosphere's terminator glow
    view = new N.default({ container: mapContainer.value, useNormal: true })
    defaultPlugin = new pluginMod.DefaultPlugin()
    view.addPlugin(defaultPlugin)
    await view.init()
    if (!view) return   // unmounted while initialising

    applySky()
    applySun()
    applyTerrain()
    view.attribution?.add([
      { attributionHtml: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2020</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (contains modified Copernicus Sentinel data 2020)' },
      { attribution: '© OpenStreetMap contributors', attributionUrl: 'https://www.openstreetmap.org/copyright' },
      { attribution: '© Re:Earth Terrain', attributionUrl: 'https://terrain.reearth.land/' },
    ])

    view.setCamera({
      lng: props.initialCenter[0], lat: props.initialCenter[1],
      height: fitAltitude(props.initialZoom), heading: 0, pitch: -90, roll: 0,
    })

    // labels need a font; the grid works without one
    N.fetchFontFamilyFromCss('Inter', 'https://fonts.googleapis.com/css2?family=Inter:wght@700')
      .then((family) => {
        view?.addFontFamily(family)
        fontReady = true
        if (isReady.value) drawPole()
      })
      .catch((e) => console.warn('[DggsNavaraGlobe] font not loaded, labels off', e))

    // camera events come from view.camera, not the view
    view.camera.on('moveend', onMoveEnd)

    if (props.showControls) {
      mapContainer.value.addEventListener('pointermove', (e) => {
        const r = mapContainer.value.getBoundingClientRect()
        pointerXY = [e.clientX - r.left, e.clientY - r.top]
        if (tooltipEl.value?.style.display === 'block') {
          tooltipEl.value.style.left = `${pointerXY[0] + 12}px`
          tooltipEl.value.style.top = `${pointerXY[1] + 12}px`
        }
      })
      view.on('featureHover', (info) => {
        const onCell = info && info.layerId === gridLayerId && info.properties?.id != null
        if (tooltipEl.value && !isTouch.value) {
          tooltipEl.value.style.display = onCell ? 'block' : 'none'
          if (onCell) {
            tooltipEl.value.innerHTML = `<b>Cell ID:</b> ${info.properties.id}`
            tooltipEl.value.style.left = `${pointerXY[0] + 12}px`
            tooltipEl.value.style.top = `${pointerXY[1] + 12}px`
          }
        }
        view.canvas.style.cursor = onCell ? 'pointer' : ''
      })
      view.on('featureClick', (info) => {
        if (!info || info.layerId !== gridLayerId || info.properties?.id == null) return
        selectCell(info.properties.id, Number(info.properties.res))
      })
    }

    webdggrid = await Webdggrid.load()
    isReady.value = true
    status.value = props.autoGenerate ? '' : 'Ready — click "Generate Grid"'
    if (props.autoGenerate || !props.showControls) generateGrid()

    // handy for poking at the scene from the console
    window.__navaraDemo = { view, webdggrid }
  } catch (err) {
    status.value = `Error: ${err?.message ?? err}`
    console.error(err)
  }
})

onUnmounted(() => {
  mobileQuery?.removeEventListener('change', onMobileChange)
  clearTimeout(multiResTimer)
  clearTimeout(settingsTimer)
  view?.dispose()
  view = null
})

defineExpose({ getView: () => view })
</script>

<template>
  <div class="dggs-globe-wrap" :style="{ height }">
    <div ref="mapContainer" class="dggs-map" />
    <div ref="tooltipEl" class="dggs-tooltip" />

    <!-- Controls panel -->
    <!-- small screens: toolbar that opens the panels as bottom sheets -->
    <div v-if="showControls && isMobile" class="dggs-mobile-bar">
      <button :class="{ active: openSheet === 'hierarchy' }" @click="toggleSheet('hierarchy')">
        Cell<span v-if="selectedCellId" class="dot" />
      </button>
      <button :class="{ active: openSheet === 'settings' }" @click="toggleSheet('settings')">Settings</button>
    </div>

    <div v-if="showControls" v-show="!isMobile || openSheet === 'settings'" class="dggs-controls" :class="{ 'is-sheet': isMobile }">
      <div class="panel-head">
        <h3>DGGRID Grid Settings</h3>
        <button v-if="isMobile" class="sheet-close" aria-label="Close settings" @click="openSheet = null">✕</button>
      </div>

      <div class="field">
        <label>{{ ctrlMaxResLabel }} <span>{{ ctrlResolution }}</span></label>
        <input v-model.number="ctrlResolution" type="range" :min="1" :max="ctrlMultiRes ? 15 : 5" />
      </div>

      <h4>Grid System</h4>
      <div class="field">
        <label>Preset</label>
        <select v-model="ctrlPreset">
          <option value="custom">Custom</option>
          <option v-for="p in PRESETS" :key="p.name" :value="p.name">{{ p.label }}</option>
        </select>
      </div>
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
          <option v-for="p in PROJECTIONS" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
      <div class="field">
        <label>Datum</label>
        <select v-model="ctrlDatum">
          <option v-for="d in DATUMS" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>

      <h4>Aperture</h4>
      <label v-if="showAperture" class="field-inline">
        <input v-model="ctrlMixedAperture" type="checkbox" /> Mixed aperture sequence
      </label>
      <div v-if="showAperture && !ctrlMixedAperture" class="field">
        <label>Aperture</label>
        <select v-model.number="ctrlAperture">
          <option :value="3">3</option>
          <option :value="4">4</option>
          <option :value="7">7</option>
        </select>
      </div>
      <div v-if="ctrlMixedAperture && showAperture" class="field">
        <label>Sequence (digits 3, 4, 7) <span>{{ ctrlApertureSeq.length }} levels</span></label>
        <input v-model="ctrlApertureSeq" type="text" placeholder="e.g. 434747" pattern="[347]*" class="aperture-seq-input" />
        <div class="aperture-seq-preview">
          <span v-for="(ch, i) in ctrlApertureSeq.split('')" :key="i" class="aperture-digit"
            :class="{ 'digit-3': ch === '3', 'digit-4': ch === '4', 'digit-7': ch === '7' }"
            :title="'Res ' + (i + 1) + ' → aperture ' + ch">{{ ch }}</span>
        </div>
      </div>
      <div class="field">
        <label>Azimuth (°)</label>
        <input v-model.number="ctrlAzimuth" type="number" min="0" max="360" step="1" />
      </div>

      <h4>Pole Coordinates</h4>
      <div class="pole-row">
        <div class="field"><label>Longitude</label><input v-model.number="ctrlPoleLng" type="number" min="-180" max="180" step="1" /></div>
        <div class="field"><label>Latitude</label><input v-model.number="ctrlPoleLat" type="number" min="-90" max="90" step="1" /></div>
      </div>

      <h4>Display</h4>
      <label class="field-inline"><input v-model="ctrlMultiRes" type="checkbox" /> Multi-resolution (viewport only)</label>
      <div v-if="ctrlMultiRes" class="field">
        <label>Zoom → Res offset <span>{{ ctrlZoomOffset }}</span></label>
        <input v-model.number="ctrlZoomOffset" type="range" min="0" max="12" />
      </div>
      <label class="field-inline"><input v-model="ctrlColorCells" type="checkbox" /> Color cells (YlOrBr)</label>
      <div class="ylorbr-swatch" />
      <div class="field" style="margin-top: 5px">
        <label>Cell opacity <span>{{ Math.round(ctrlOpacity * 100) }}%</span></label>
        <input v-model.number="ctrlOpacity" type="range" min="0.05" max="0.95" step="0.05" />
      </div>

      <h4>Scene</h4>
      <label class="field-inline"><input v-model="ctrlSky" type="checkbox" /> Sky, sun &amp; atmosphere</label>
      <label class="field-inline"><input v-model="ctrlCellsLit" type="checkbox" :disabled="!ctrlSky" /> Shade cells with sunlight</label>
      <label class="field-inline"><input v-model="ctrlTerrain" type="checkbox" /> Terrain relief</label>
      <div class="field">
        <label>Basemap</label>
        <select v-model="ctrlBasemap">
          <option value="satellite">Sentinel-2 satellite</option>
          <option value="osm">OpenStreetMap</option>
          <option value="none">None</option>
        </select>
      </div>
      <div v-if="ctrlSky" class="field">
        <label>Sun (UTC, equinox) <span>{{ String(Math.floor(ctrlSunHour)).padStart(2, '0') }}:{{ String(Math.round((ctrlSunHour % 1) * 60)).padStart(2, '0') }}</span></label>
        <input v-model.number="ctrlSunHour" type="range" min="0" max="23.75" step="0.25" />
      </div>
      <div class="fly-row">
        <button @click="flyTo(0, 90, 1.6)">North Pole</button>
        <button @click="flyTo(0, -90, 1.6)">South Pole</button>
        <button @click="flyTo(10, 25, 1.5)">Globe</button>
      </div>

      <button :disabled="!isReady || isGenerating" class="generate-btn" :style="{ display: ctrlMultiRes ? 'none' : '' }" @click="generateGrid">
        {{ !isReady ? 'Loading…' : isGenerating ? 'Generating…' : 'Generate Grid' }}
      </button>
    </div>

    <!-- Cell Hierarchy panel (top-left) -->
    <div v-if="showControls" v-show="!isMobile || openSheet === 'hierarchy'" class="dggs-hierarchy" :class="{ 'is-sheet': isMobile }">
      <div class="panel-head">
        <h3>Cell Hierarchy</h3>
        <button v-if="isMobile" class="sheet-close" aria-label="Close cell hierarchy" @click="openSheet = null">✕</button>
      </div>
      <div class="field">
        <label>Index Type</label>
        <select v-model="ctrlIndexType">
          <option v-for="t in availableIndexTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div v-if="ctrlMixedAperture && showAperture" class="hier-group">
        <div class="hier-label">Aperture per level</div>
        <div class="aperture-seq-preview">
          <span v-for="(ch, i) in ctrlApertureSeq.split('')" :key="i" class="aperture-digit"
            :class="{ 'digit-3': ch === '3', 'digit-4': ch === '4', 'digit-7': ch === '7', 'digit-active': selectedCellRes !== null && i + 1 === selectedCellRes }"
            :title="'Res ' + (i + 1) + ' → aperture ' + ch">{{ ch }}</span>
        </div>
      </div>

      <template v-if="selectedCellId">
        <div class="hier-cell-id">
          Selected: <strong>{{ getCellIndexLabel(selectedCellId, selectedCellRes) }}</strong>
          <span class="hier-res">res {{ selectedCellRes }}</span>
          <button class="hier-clear-btn" @click="clearSelection">Clear</button>
        </div>
        <div v-if="hierarchyInfo.allParents.length" class="hier-group">
          <div class="hier-label hier-parent-label">Parents ({{ hierarchyInfo.allParents.length }}, res {{ selectedCellRes - 1 }})</div>
          <div class="hier-chips">
            <span v-for="(p, i) in hierarchyInfo.allParents" :key="i" class="hier-chip hier-chip-parent" :class="{ 'hier-chip-primary': i === 0 }">{{ p.toString() }}<span v-if="i === 0" class="hier-primary-badge">primary</span></span>
          </div>
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
      <div v-else class="hier-hint">{{ isTouch ? 'Tap' : 'Click' }} a cell on the globe to inspect its hierarchy</div>
    </div>

    <div v-if="status" v-show="!(isMobile && openSheet)" class="dggs-status">{{ status }}</div>
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

/* ---- aperture sequence ---- */
.aperture-seq-input {
  font-family: monospace;
  letter-spacing: 2px;
}
.aperture-seq-preview {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  margin-top: 2px;
}
.aperture-digit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  font-family: monospace;
  color: #fff;
}
.digit-3 { background: #2b7fd4; }
.digit-4 { background: #cc9900; }
.digit-7 { background: #cc4c02; }
.digit-active { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; }

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
.hier-chip-parent { border-left: 2px solid #33cc33; }
.hier-chip-primary { font-weight: 600; }
.hier-primary-badge {
  font-size: 8px;
  font-weight: 600;
  color: #1a8a1a;
  margin-left: 3px;
  text-transform: uppercase;
}
.hier-chip-child { border-left: 2px solid #ffcc00; }
.hier-chip-neighbor { border-left: 2px solid #3399ff; }
.hier-hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin-top: 2px;
}

/* ---- Navara page extras ---- */
.dggs-map { background-color: #000; }
.fly-row { display: flex; gap: 4px; margin-top: 6px; }
.fly-row button {
  flex: 1; font-size: 10px; padding: 3px 2px;
  border: 1px solid var(--vp-c-divider); border-radius: 3px;
  background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); cursor: pointer;
}
.fly-row button:hover { border-color: var(--vp-c-brand-1); }
.field-inline input[type='checkbox']:disabled + * { opacity: 0.5; }
.dggs-controls, .dggs-hierarchy {
  background: color-mix(in srgb, var(--vp-c-bg-elv) 88%, transparent);
  backdrop-filter: blur(8px);
}

/* ---- panel header with a close button on small screens ---- */
.panel-head { display: flex; align-items: center; justify-content: space-between; }
.panel-head h3 { margin: 0 0 6px; }
.sheet-close {
  border: none; background: transparent; color: var(--vp-c-text-2);
  font-size: 16px; line-height: 1; padding: 4px 6px; margin: -4px -6px 2px 0; cursor: pointer;
}

/* ---- small screens ---- */
.dggs-mobile-bar { display: none; }
@media (max-width: 768px) {
  .dggs-mobile-bar {
    display: flex; gap: 6px;
    position: absolute; top: 10px; right: 10px; z-index: 12;
  }
  .dggs-mobile-bar button {
    position: relative;
    font-size: 13px; font-weight: 600; padding: 8px 14px; min-height: 36px;
    border-radius: 18px; border: 1px solid var(--vp-c-divider);
    background: color-mix(in srgb, var(--vp-c-bg-elv) 90%, transparent);
    backdrop-filter: blur(8px);
    color: var(--vp-c-text-1); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  }
  .dggs-mobile-bar button.active { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
  .dggs-mobile-bar .dot {
    position: absolute; top: 6px; right: 7px; width: 7px; height: 7px;
    border-radius: 50%; background: #ff3333;
  }

  /* both panels become a bottom sheet over the lower part of the globe */
  .dggs-controls.is-sheet,
  .dggs-hierarchy.is-sheet {
    top: auto; left: 0; right: 0; bottom: 0;
    width: auto; max-height: 55%;
    border-radius: 14px 14px 0 0;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
    z-index: 15;
  }
  /* larger touch targets */
  .is-sheet .field input[type='number'],
  .is-sheet .field select,
  .is-sheet .field input[type='text'] { font-size: 14px; padding: 6px 8px; }
  .is-sheet .field label,
  .is-sheet .field-inline { font-size: 13px; }
  .is-sheet .field-inline input[type='checkbox'] { width: 18px; height: 18px; }
  .is-sheet .fly-row button { font-size: 12px; padding: 8px 4px; }
  .is-sheet .generate-btn { font-size: 13px; padding: 10px; }
  .is-sheet .hier-chip { font-size: 12px; padding: 3px 7px; }

  /* status: top-left, may wrap, out of the toolbar's way */
  .dggs-status {
    top: 10px; bottom: auto; left: 10px; transform: none;
    max-width: calc(100% - 190px);
    white-space: normal; font-size: 11px; line-height: 1.3;
    padding: 6px 10px; border-radius: 12px;
  }
}
</style>

<style>
/* Navara appends an empty 100vw x 100vh #navara-root to <body> (we render
   into our own container); keep it out of the page flow so the docs page
   gets no scrollbars. */
#navara-root {
  position: fixed !important;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}
</style>
