<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ylOrBrRgba } from '../utils/globeUtils.js'
import { loadWebdggrid } from '../utils/loadWebdggrid.js'
import {
  PRESETS, PROJECTIONS, DATUMS, indexTypesFor, indexLabel, CELL_STYLE,
  WORLD, padExtent, extentContains, extentSeqNums, samplingSteps,
} from '../utils/demoGrid.js'

const props = defineProps({
  /** Show a raster basemap */
  showBasemap: { type: Boolean, default: true },
  /** Initial basemap: 'satellite' (Sentinel-2), 'osm' or 'none' */
  initialBasemap: { type: String, default: 'satellite' },
  /** Show the controls panel */
  showControls: { type: Boolean, default: true },
  /** CSS height of the map container */
  height: { type: String, default: '100vh' },
  /** Generate grid immediately on load (no button click needed) */
  autoGenerate: { type: Boolean, default: false },
  // Initial grid settings (all overridable from controls when showControls=true)
  initialResolution: { type: Number, default: 3 },
  /** Start in multi-resolution mode: cells for the viewport plus the next coarser level */
  initialMultiRes: { type: Boolean, default: true },
  /** Zoom → resolution offset used in multi-resolution mode */
  initialZoomOffset: { type: Number, default: 1 },
  initialTopology: { type: String, default: 'HEXAGON' },
  initialProjection: { type: String, default: 'ISEA' },
  initialAperture: { type: Number, default: 4 },
  initialAzimuth: { type: Number, default: 0 },
  initialPoleLng: { type: Number, default: 0 },
  initialPoleLat: { type: Number, default: 0 },
  initialCenter: { type: Array, default: () => [0, 20] },
  /** Equivalent MapLibre globe zoom level — mapped to a Cesium camera altitude. */
  initialZoom: { type: Number, default: 1.8 },
  /** Cell fill color (CSS); its opacity comes from the opacity slider */
  fillColor: { type: String, default: CELL_STYLE.fill },
  /** Cell line color (CSS) */
  lineColor: { type: String, default: CELL_STYLE.outline },
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

// in multi-resolution mode the slider is the maximum resolution
const ctrlResolution   = ref(props.initialMultiRes ? 15 : props.initialResolution)
const ctrlMaxResLabel  = ref(props.initialMultiRes ? 'Max Resolution' : 'Resolution')
const ctrlTopology     = ref(props.initialTopology)
const ctrlProjection   = ref(props.initialProjection)
const ctrlAperture     = ref(props.initialAperture)
const ctrlAzimuth      = ref(props.initialAzimuth)
const ctrlPoleLng      = ref(props.initialPoleLng)
const ctrlPoleLat      = ref(props.initialPoleLat)
const ctrlColorCells   = ref(false)
const ctrlMultiRes     = ref(props.initialMultiRes)
const ctrlZoomOffset   = ref(props.initialZoomOffset)
const ctrlDatum        = ref('AUTHALIC_SPHERE')
const ctrlPreset       = ref('custom')
const ctrlOpacity      = ref(0.3)
const ctrlBasemap      = ref(props.showBasemap ? props.initialBasemap : 'none')
const showAperture     = ref(props.initialTopology === 'HEXAGON')
const ctrlMixedAperture = ref(false)
const ctrlApertureSeq   = ref('434747')

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
const hierarchyInfo   = reactive({
  parent: null,
  allParents: [],
  children: [],
  neighbors: [],
})
const ctrlIndexType   = ref('SEQNUM')
const availableIndexTypes = computed(() => indexTypesFor({
  topology: ctrlTopology.value,
  aperture: ctrlAperture.value,
  mixed: ctrlMixedAperture.value && ctrlTopology.value === 'HEXAGON',
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

// --- non-reactive Cesium state ---
let viewer            = null
let webdggrid         = null
let gridDataSource    = null
let baseDataSource    = null
let parentDataSource  = null
let childrenDataSource = null
let selectedDataSource = null
let poleEntity        = null
let pickHandler       = null
let cameraMoveEndCb   = null
let lastFineFc        = null
let lastBaseFc        = null
let multiResTimer     = null
let themeObserver     = null

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
// Coordinate / camera helpers
// ---------------------------------------------------------------------------

// True pass-through. Both the naive rewrap and the heavier
// processFcForGlobe (centroid recenter + pole-vertex injection) end up
// breaking polar cells in Cesium more than they help — keep the FC
// untouched and let Cesium's GEODESIC arcType + the raw vertex order from
// DGGRID do the work.
function prepareFc(fc) {
  return fc
}

function rgbaArrayToCesium([r, g, b, a]) {
  return Cesium.Color.fromBytes(r, g, b, a ?? 255)
}

// Cesium draws polygon outlines as aliased 1 px GL lines and ignores
// outlineWidth on WebGL, which is what made the cell edges look jagged and
// hairline-thin. Draw each outline as a ground-clamped geodesic polyline on
// the same entity instead: anti-aliased, real width, and picking still
// returns the cell entity.
function setOutline(entity, color, width) {
  const h = entity.polygon?.hierarchy?.getValue(Cesium.JulianDate.now())
  entity.polygon.outline = false
  if (!h?.positions?.length) return
  entity.polyline = new Cesium.PolylineGraphics({
    positions: [...h.positions, h.positions[0]],
    width,
    material: color,
    arcType: Cesium.ArcType.GEODESIC,
    clampToGround: false,
  })
}

// Pull the current theme background from the live VitePress CSS variable.
// Falls back to the standard VitePress dark/light bg when the variable hasn't
// been computed yet (very early in mount).
function readThemeBg() {
  const isDark = document.documentElement.classList.contains('dark')
  const cssBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--vp-c-bg').trim()
  return cssBg || (isDark ? '#1b1b1f' : '#ffffff')
}

// Sync the Cesium scene chrome (background canvas, globe base color) with
// the current VitePress theme. We always hide sky/atmosphere/sun/moon so
// the canvas behind the globe is just the themed flat color — that's what
// makes the globe look like a first-class part of the page rather than
// a window into Cesium space.
function applyTheme(v, hasBasemap) {
  if (!v) return
  const themed = Cesium.Color.fromCssColorString(readThemeBg())
  v.scene.backgroundColor = themed
  v.scene.globe.baseColor = themed
  v.scene.skyAtmosphere.show = false
  if (v.scene.skyBox) v.scene.skyBox.show = false
  if (v.scene.sun)    v.scene.sun.show    = false
  if (v.scene.moon)   v.scene.moon.show   = false
  v.scene.requestRender()
}

// Map MapLibre-style globe zoom levels to a sensible Cesium camera altitude
// so the existing `initialZoom` prop and the multi-res zoom-offset slider keep
// working without changing their meaning.
function altitudeFromZoom(zoom) {
  return 40_000_000 * Math.pow(2, -zoom)
}

// The zoom levels assume a landscape view; on a portrait screen the globe is
// limited by the width, so move the camera back until it fits.
function fitAltitude(zoom) {
  const el = mapContainer.value
  const aspect = el && el.clientHeight ? el.clientWidth / el.clientHeight : 1
  return altitudeFromZoom(zoom) / Math.min(1, aspect * 1.15)
}

function zoomFromAltitude() {
  if (!viewer) return 0
  const h = viewer.camera.positionCartographic.height
  return Math.log2(40_000_000 / Math.max(h, 1))
}

// ---------------------------------------------------------------------------
// Basemap
// ---------------------------------------------------------------------------

function applyBasemap() {
  if (!viewer) return
  viewer.imageryLayers.removeAll()
  if (ctrlBasemap.value === 'satellite') {
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://tiles.maps.eox.at/wmts?layer=s2cloudless-2020_3857&style=default' +
        '&tilematrixset=g&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg' +
        '&TileMatrix={z}&TileCol={x}&TileRow={y}',
      maximumLevel: 15,
      credit: 'Sentinel-2 cloudless 2020 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2020)',
    }))
  } else if (ctrlBasemap.value === 'osm') {
    viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
      url: 'https://tile.openstreetmap.org/',
      credit: '© OpenStreetMap contributors',
    }))
  }
}

function flyTo(lng, lat, zoom) {
  viewer?.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lng, lat, fitAltitude(zoom)), duration: 1.8 })
  if (isMobile.value) openSheet.value = null
}

// ---------------------------------------------------------------------------
// Cesium layer helpers
// ---------------------------------------------------------------------------

// fill/stroke are CSS colors; opacity applies to the fill
async function buildCellDataSource(fc, { fill, stroke, opacity = 1, isBase, colored }) {
  const ds = await Cesium.GeoJsonDataSource.load(fc, { clampToGround: false })

  const baseFill = Cesium.Color.fromCssColorString(fill).withAlpha(opacity)
  const strokeColor = Cesium.Color.fromCssColorString(stroke)
  const coloredAlpha = Math.round(Math.min(1, opacity + 0.35) * 255)
  ds.entities.values.forEach((e) => {
    if (!e.polygon) return
    e.polygon.arcType = Cesium.ArcType.GEODESIC
    e.polygon.height  = 0
    setOutline(e, strokeColor, isBase ? 3 : 1.5)
    if (isBase) {
      e.polygon.fill = false
    } else if (colored) {
      const t = Number(e.properties?.colorValue?.getValue?.() ?? 0)
      e.polygon.material = rgbaArrayToCesium(ylOrBrRgba(t, coloredAlpha))
    } else {
      e.polygon.material = baseFill
    }
  })

  return ds
}

async function updateLayers(fineFc, baseFc) {
  if (!viewer) return
  const colored = ctrlColorCells.value

  // build the new data sources first and remove the old ones afterwards,
  // so a refresh never blinks the grid out
  const oldGrid = gridDataSource, oldBase = baseDataSource
  gridDataSource = baseDataSource = null

  if (baseFc) {
    baseDataSource = await buildCellDataSource(baseFc, {
      fill:    '#000000',
      stroke:  CELL_STYLE.base,
      opacity: 0,
      isBase:  true,
      colored: false,
    })
    await viewer.dataSources.add(baseDataSource)
  }
  if (fineFc) {
    gridDataSource = await buildCellDataSource(fineFc, {
      fill:    props.fillColor,
      stroke:  colored ? CELL_STYLE.outlineColored : props.lineColor,
      opacity: ctrlOpacity.value,
      isBase:  false,
      colored,
    })
    await viewer.dataSources.add(gridDataSource)
  }
  if (oldGrid) viewer.dataSources.remove(oldGrid, true)
  if (oldBase) viewer.dataSources.remove(oldBase, true)
}

// ---------------------------------------------------------------------------
// Multi-res helpers
// ---------------------------------------------------------------------------

function zoomToResolution(zoom, maxRes) {
  const res = Math.round(zoom) + ctrlZoomOffset.value
  return Math.min(maxRes, Math.max(1, res))
}

// The camera's view rectangle as an extent, or null when the view goes past
// the globe's edge (whole-world view).
function viewportExtent() {
  const rect = viewer.camera.computeViewRectangle()
  if (!rect) return null
  const minLng = Cesium.Math.toDegrees(rect.west)
  let maxLng = Cesium.Math.toDegrees(rect.east)
  if (maxLng < minLng) maxLng += 360 // antimeridian-crossing rectangle
  return {
    minLng, maxLng,
    minLat: Math.max(Cesium.Math.toDegrees(rect.south), -89.9),
    maxLat: Math.min(Cesium.Math.toDegrees(rect.north), 89.9),
  }
}

// What the current cells were generated for; a camera move only regenerates
// when the resolution changes or the view leaves the (padded) area covered.
let lastGen = null   // { res, extent, cfgKey }
const MULTIRES_PAD = 0.5

// ---------------------------------------------------------------------------
// Main grid generation
// ---------------------------------------------------------------------------

// keepSelection: a camera-driven refresh keeps the selected cell and its
// hierarchy; a settings change starts over.
function generateGrid({ keepSelection = false } = {}) {
  if (!isReady.value || !webdggrid) return

  if (!keepSelection) {
    selectedCellId.value = null
    selectedCellRes.value = null
    hierarchyInfo.parent = null
    hierarchyInfo.allParents = []
    hierarchyInfo.children = []
    hierarchyInfo.neighbors = []
    removeHierarchyLayers()
  }

  const maxRes     = ctrlResolution.value
  const multiRes   = ctrlMultiRes.value
  const isMixed    = ctrlMixedAperture.value && ctrlTopology.value === 'HEXAGON'
  const resolution = multiRes
    ? zoomToResolution(zoomFromAltitude(), isMixed ? ctrlApertureSeq.value.length : maxRes)
    : isMixed ? Math.min(maxRes, ctrlApertureSeq.value.length) : maxRes
  const topology   = ctrlTopology.value
  const projection = ctrlProjection.value
  const aperture   = ctrlAperture.value
  const azimuth    = ctrlAzimuth.value
  const poleLng    = ctrlPoleLng.value
  const poleLat    = ctrlPoleLat.value

  const dggsConfig = {
    poleCoordinates: { lat: poleLat, lng: poleLng },
    azimuth, topology, projection, aperture,
    datum: ctrlDatum.value,
  }
  if (isMixed) dggsConfig.apertureSequence = ctrlApertureSeq.value

  webdggrid.setDggs(dggsConfig, resolution)

  // In multi-res mode, ctrlResolution is the user's "Max Resolution" cap —
  // don't write the engine's computed resolution back to it (that clobbers
  // the cap and makes the Zoom→Res offset slider appear broken because the
  // ceiling drops every call). In single-res mode, ctrlResolution IS the
  // rendered resolution, so keep them in sync.
  if (!multiRes) ctrlResolution.value = resolution
  status.value = 'Generating grid…'
  if (!multiRes) isGenerating.value = true

  setTimeout(async () => {
    try {
      function buildFc(seqNums, res) {
        const total = webdggrid.nCells(res)
        const fc    = webdggrid.sequenceNumToGridFeatureCollection(seqNums, res, false)
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
        return prepareFc(fc)
      }

      let seqNums
      let baseFc = null

      if (multiRes) {
        // Cover more than the viewport, so small pans need no new cells. A
        // whole-world view samples the world instead of enumerating every
        // cell (at res 15 that's billions and traps the WASM module).
        const visible = viewportExtent()
        const extent = visible ? padExtent(visible, MULTIRES_PAD) : WORLD
        seqNums = extentSeqNums(webdggrid, resolution, extent, samplingSteps(webdggrid, resolution, extent))

        const baseRes = Math.max(1, resolution - 1)
        webdggrid.setDggs(dggsConfig, baseRes)
        baseFc = buildFc(extentSeqNums(webdggrid, baseRes, extent, samplingSteps(webdggrid, baseRes, extent)), baseRes)

        webdggrid.setDggs(dggsConfig, resolution)
        lastGen = { res: resolution, extent, cfgKey: JSON.stringify(dggsConfig) }
      } else {
        lastGen = null
        const total = webdggrid.nCells(resolution)
        if (total > MAX_GLOBE_CELLS) throw new Error(`${total} cells — lower the resolution or use multi-resolution`)
        seqNums = Array.from({ length: total }, (_, i) => BigInt(i + 1))
      }

      const fineFc = buildFc(seqNums, resolution)
      lastFineFc = fineFc
      lastBaseFc = baseFc
      await updateLayers(fineFc, baseFc)
      // keep the selection drawn above the new grid
      if (keepSelection && selectedCellId.value) await updateHierarchyLayers(selectedCellId.value, selectedCellRes.value)

      const modeLabel = multiRes ? `res ${resolution} · viewport` : `res ${resolution} · globe`
      const apLabel = isMixed ? `mixed [${dggsConfig.apertureSequence}]` : topology
      status.value = `${seqNums.length} cells · ${modeLabel} · ${apLabel}`
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
  if (val !== 'HEXAGON') {
    ctrlAperture.value = 4
    ctrlMixedAperture.value = false
  }
})

watch([ctrlColorCells, ctrlOpacity], () => {
  if (isReady.value) updateLayers(lastFineFc, lastBaseFc)
})
watch(ctrlBasemap, applyBasemap)

watch(ctrlZoomOffset, () => {
  if (isReady.value && webdggrid) generateGrid()
})

watch([ctrlPoleLng, ctrlPoleLat], () => {
  if (poleEntity) {
    poleEntity.position = Cesium.Cartesian3.fromDegrees(ctrlPoleLng.value, ctrlPoleLat.value)
  }
})

// In multi-res mode the "Generate Grid" button is hidden, so any setting
// that affects the grid must auto-regenerate. Debounced so dragging the
// resolution slider doesn't fire one regeneration per integer step.
let multiResSettingsTimer = null
function scheduleMultiResRegen() {
  if (!ctrlMultiRes.value || !isReady.value || !webdggrid) return
  clearTimeout(multiResSettingsTimer)
  multiResSettingsTimer = setTimeout(generateGrid, 150)
}
watch(
  [ctrlResolution, ctrlTopology, ctrlProjection, ctrlAperture, ctrlAzimuth, ctrlPoleLng, ctrlPoleLat, ctrlMixedAperture, ctrlApertureSeq, ctrlDatum],
  scheduleMultiResRegen,
)

// Cesium entities get slow well before the Navara demo's limit
const MAX_GLOBE_CELLS = 20000

function syncMoveEndListener() {
  if (!viewer) return
  if (cameraMoveEndCb) {
    viewer.camera.moveEnd.removeEventListener(cameraMoveEndCb)
    cameraMoveEndCb = null
  }
  if (ctrlMultiRes.value) {
    cameraMoveEndCb = onMoveEnd
    viewer.camera.moveEnd.addEventListener(cameraMoveEndCb)
  }
}

watch(ctrlMultiRes, (on) => {
  ctrlMaxResLabel.value = on ? 'Max Resolution' : 'Resolution'
  if (on) {
    ctrlResolution.value = 15
  } else if (webdggrid) {
    // the highest resolution up to 5 whose whole-globe grid stays drawable
    let r = Math.min(ctrlResolution.value, 5)
    while (r > 1 && webdggrid.nCells(r) > MAX_GLOBE_CELLS) r--
    ctrlResolution.value = r
  }
  syncMoveEndListener()
  if (isReady.value && webdggrid) generateGrid()
})

function currentConfigKey() {
  const isMixed = ctrlMixedAperture.value && ctrlTopology.value === 'HEXAGON'
  const cfg = {
    poleCoordinates: { lat: ctrlPoleLat.value, lng: ctrlPoleLng.value },
    azimuth: ctrlAzimuth.value, topology: ctrlTopology.value,
    projection: ctrlProjection.value, aperture: ctrlAperture.value,
    datum: ctrlDatum.value,
  }
  if (isMixed) cfg.apertureSequence = ctrlApertureSeq.value
  return JSON.stringify(cfg)
}

function onMoveEnd() {
  if (!ctrlMultiRes.value || !isReady.value || !webdggrid) return
  clearTimeout(multiResTimer)
  multiResTimer = setTimeout(() => {
    const isMixed = ctrlMixedAperture.value && ctrlTopology.value === 'HEXAGON'
    const res = zoomToResolution(zoomFromAltitude(), isMixed ? ctrlApertureSeq.value.length : ctrlResolution.value)
    const visible = viewportExtent()
    const stillCovered = lastGen
      && lastGen.res === res
      && lastGen.cfgKey === currentConfigKey()
      && visible && extentContains(lastGen.extent, visible)
    if (!stillCovered) generateGrid({ keepSelection: true })
  }, 300)
}

// ---------------------------------------------------------------------------
// Hierarchy selection
// ---------------------------------------------------------------------------

function getCellIndexLabel(seqnum, resolution) {
  return indexLabel(webdggrid, ctrlIndexType.value, seqnum, resolution)
}

function selectCell(cellId, resolution) {
  if (!webdggrid) return

  const seqnum = typeof cellId === 'bigint' ? cellId : BigInt(cellId)
  selectedCellId.value = seqnum
  selectedCellRes.value = resolution
  if (isMobile.value) openSheet.value = 'hierarchy'

  try {
    const fc = sanitizeFc(webdggrid.sequenceNumToGridFeatureCollection([seqnum], resolution, false))
    const geom = fc.features[0]?.geometry
    console.log('[DggsGlobe] selected cell', {
      seqnum: seqnum.toString(),
      resolution,
      indexLabel: getCellIndexLabel(seqnum, resolution),
      geometry: geom,
      geojson: JSON.stringify(geom),
    })
  } catch (e) {
    console.warn('[DggsGlobe] could not log selected geometry:', e)
  }

  try {
    hierarchyInfo.neighbors = webdggrid.sequenceNumNeighbors([seqnum], resolution)[0]
  } catch { hierarchyInfo.neighbors = [] }
  try {
    if (resolution > 0) {
      hierarchyInfo.allParents = webdggrid.sequenceNumAllParents([seqnum], resolution)[0]
      hierarchyInfo.parent = hierarchyInfo.allParents[0] ?? null
    } else {
      hierarchyInfo.allParents = []
      hierarchyInfo.parent = null
    }
  } catch { hierarchyInfo.parent = null; hierarchyInfo.allParents = [] }
  try {
    hierarchyInfo.children = webdggrid.sequenceNumChildren([seqnum], resolution)[0]
  } catch { hierarchyInfo.children = [] }

  updateHierarchyLayers(seqnum, resolution)
}

function clearSelection() {
  selectedCellId.value = null
  selectedCellRes.value = null
  hierarchyInfo.parent = null
  hierarchyInfo.allParents = []
  hierarchyInfo.children = []
  hierarchyInfo.neighbors = []
  removeHierarchyLayers()
}

function removeHierarchyLayers() {
  if (!viewer) return
  for (const ds of [parentDataSource, childrenDataSource, selectedDataSource]) {
    if (ds) viewer.dataSources.remove(ds, true)
  }
  parentDataSource = childrenDataSource = selectedDataSource = null
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

async function updateHierarchyLayers(seqnum, resolution) {
  if (!viewer) return

  removeHierarchyLayers()

  // --- Parent polygons (all touching parents) ---
  if (hierarchyInfo.allParents.length > 0 && resolution > 0) {
    try {
      const parentFc = prepareFc(sanitizeFc(
        webdggrid.sequenceNumToGridFeatureCollection(hierarchyInfo.allParents, resolution - 1, false)
      ))
      parentFc.features.forEach((f, i) => { f.properties._primary = i === 0 })

      parentDataSource = await Cesium.GeoJsonDataSource.load(parentFc, { clampToGround: false })
      parentDataSource.entities.values.forEach((e) => {
        if (!e.polygon) return
        const isPrimary = !!e.properties?._primary?.getValue?.()
        e.polygon.arcType  = Cesium.ArcType.GEODESIC
        e.polygon.height   = 0
        e.polygon.material = Cesium.Color.fromCssColorString(isPrimary ? 'rgba(34,204,85,0.35)' : 'rgba(102,221,136,0.25)')
        setOutline(e, Cesium.Color.fromCssColorString(isPrimary ? '#11aa33' : '#44bb66'), isPrimary ? 3 : 2)
      })

      // Parent labels at cell centers
      hierarchyInfo.allParents.forEach((p, i) => {
        try {
          const geo = webdggrid.sequenceNumToGeo([p], resolution - 1)[0]
          parentDataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(geo[0], geo[1]),
            label: {
              text: getCellIndexLabel(p, resolution - 1),
              font: i === 0 ? 'bold 13px sans-serif' : 'bold 11px sans-serif',
              fillColor: Cesium.Color.fromCssColorString(i === 0 ? '#1a8a1a' : '#5a9a5a'),
              outlineColor: Cesium.Color.fromCssColorString('rgba(255,255,255,0.95)'),
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -2),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          })
        } catch { /* skip */ }
      })

      await viewer.dataSources.add(parentDataSource)
    } catch (err) { console.error('Parent geometry error:', err) }
  }

  // --- Children polygons ---
  if (hierarchyInfo.children.length > 0) {
    try {
      const childFc = prepareFc(sanitizeFc(
        webdggrid.sequenceNumToGridFeatureCollection(hierarchyInfo.children, resolution + 1, false)
      ))
      childrenDataSource = await Cesium.GeoJsonDataSource.load(childFc, { clampToGround: false })
      childrenDataSource.entities.values.forEach((e) => {
        if (!e.polygon) return
        e.polygon.arcType  = Cesium.ArcType.GEODESIC
        e.polygon.height   = 0
        e.polygon.material = Cesium.Color.fromCssColorString('rgba(255,204,0,0.3)')
        setOutline(e, Cesium.Color.fromCssColorString('#cc9900'), 2)
      })

      hierarchyInfo.children.forEach((c) => {
        try {
          const geo = webdggrid.sequenceNumToGeo([c], resolution + 1)[0]
          childrenDataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(geo[0], geo[1]),
            label: {
              text: getCellIndexLabel(c, resolution + 1),
              font: 'bold 10px sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#886600'),
              outlineColor: Cesium.Color.fromCssColorString('rgba(255,255,255,0.95)'),
              outlineWidth: 1.5,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          })
        } catch { /* skip */ }
      })

      await viewer.dataSources.add(childrenDataSource)
    } catch { /* skip */ }
  }

  // --- Selected cell highlight (always on top) ---
  try {
    const centerFc = prepareFc(sanitizeFc(
      webdggrid.sequenceNumToGridFeatureCollection([seqnum], resolution, false)
    ))
    selectedDataSource = await Cesium.GeoJsonDataSource.load(centerFc, { clampToGround: false })
    selectedDataSource.entities.values.forEach((e) => {
      if (!e.polygon) return
      e.polygon.arcType  = Cesium.ArcType.GEODESIC
      e.polygon.height   = 0
      e.polygon.material = Cesium.Color.fromCssColorString('rgba(255,51,51,0.25)')
      setOutline(e, Cesium.Color.fromCssColorString('#ff3333'), 3)
    })

    const geo = webdggrid.sequenceNumToGeo([seqnum], resolution)[0]
    selectedDataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(geo[0], geo[1]),
      label: {
        text: getCellIndexLabel(seqnum, resolution),
        font: 'bold 14px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#ff3333'),
        outlineColor: Cesium.Color.fromCssColorString('rgba(255,255,255,0.95)'),
        outlineWidth: 2.5,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    await viewer.dataSources.add(selectedDataSource)
  } catch { /* skip */ }
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

  // Needed so BigInt properties survive JSON serialisation
  if (!BigInt.prototype.toJSON) {
    BigInt.prototype.toJSON = function () { return this.toString() }
  }

  // CESIUM_BASE_URL must be set BEFORE Cesium.js is loaded
  window.CESIUM_BASE_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.122/Build/Cesium/'
  loadLink('https://cdn.jsdelivr.net/npm/cesium@1.122/Build/Cesium/Widgets/widgets.css')

  try {
    await loadScript('https://cdn.jsdelivr.net/npm/cesium@1.122/Build/Cesium/Cesium.js')
    const Webdggrid = await loadWebdggrid()

    viewer = new Cesium.Viewer(mapContainer.value, {
      baseLayer: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      timeline: false,
      animation: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      // render at the screen's pixel density; Cesium's default renders at
      // CSS resolution and upscales, which blurs edges on high-DPI screens
      useBrowserRecommendedResolution: false,
    })

    applyBasemap()
    viewer.scene.globe.enableLighting = false

    // Sharpen the rendering pipeline: Cesium's defaults run an HDR tonemap
    // and an FXAA pass that together wash colors out and soften every cell
    // outline. We want crisp, saturated cell colors over the basemap.
    viewer.scene.highDynamicRange = false
    if (viewer.scene.postProcessStages.fxaa) {
      viewer.scene.postProcessStages.fxaa.enabled = false
    }
    // 4× MSAA gives clean polygon edges without the FXAA blur.
    if ('msaaSamples' in viewer.scene) viewer.scene.msaaSamples = 4
    // Atmosphere haze tints the basemap blue at low altitudes; off.
    viewer.scene.globe.showGroundAtmosphere = false
    viewer.scene.fog.enabled = false

    // Re-paint scene chrome (background, globe base, sky) whenever VitePress
    // toggles the `.dark` class on <html>. Stays in sync with the user's
    // OS / docs theme switcher without remounting the Cesium viewer.
    applyTheme(viewer, props.showBasemap)
    themeObserver = new MutationObserver(() => applyTheme(viewer, props.showBasemap))
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    if (!props.interactive) {
      const c = viewer.scene.screenSpaceCameraController
      c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = false
    } else {
      // Default Cesium controls, just clamp the zoom-out so the user can't
      // back the camera out into space (where the sun/sky would otherwise
      // be visible if the theme paint hadn't already hidden them).
      // ~7× Earth radius — comfortably outside any plausible "view the
      // whole grid at once" use case but well short of solar-system scale.
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50_000_000
    }

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        props.initialCenter[0],
        props.initialCenter[1],
        fitAltitude(props.initialZoom),
      ),
    })

    if (props.showControls) {
      poleEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(ctrlPoleLng.value, ctrlPoleLat.value),
        point: {
          color: Cesium.Color.fromCssColorString('#e53935'),
          pixelSize: 11,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: 'Pole',
          font: 'bold 11px sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#333'),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(255,255,255,0.92)'),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          pixelOffset: new Cesium.Cartesian2(14, 0),
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          style: Cesium.LabelStyle.FILL,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    }

    if (props.showControls) {
      syncMoveEndListener()   // multi-resolution may be on from the start
      pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

      pickHandler.setInputAction((event) => {
        const picked = viewer.scene.pick(event.endPosition)
        const isCell = picked && picked.id && picked.id.entityCollection?.owner === gridDataSource && picked.id.polygon
        if (isCell) {
          if (tooltipEl.value && !isTouch.value) {
            tooltipEl.value.style.display = 'block'
            tooltipEl.value.style.left = `${event.endPosition.x + 12}px`
            tooltipEl.value.style.top  = `${event.endPosition.y + 12}px`
            const id = picked.id.properties?.id?.getValue?.() ?? picked.id.id
            tooltipEl.value.innerHTML = `<b>Cell ID:</b> ${id}`
          }
          viewer.scene.canvas.style.cursor = 'pointer'
        } else {
          if (tooltipEl.value) tooltipEl.value.style.display = 'none'
          viewer.scene.canvas.style.cursor = ''
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      pickHandler.setInputAction((event) => {
        const picked = viewer.scene.pick(event.position)
        const isCell = picked && picked.id && picked.id.entityCollection?.owner === gridDataSource && picked.id.polygon
        if (isCell) {
          const cellId = picked.id.properties?.id?.getValue?.() ?? picked.id.id
          if (cellId != null) {
            const resolution = ctrlMultiRes.value
              ? zoomToResolution(zoomFromAltitude(), ctrlResolution.value)
              : ctrlResolution.value
            selectCell(cellId, resolution)
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }

    webdggrid = await Webdggrid.load()

    // handy for poking at the scene from the console
    window.__cesiumDemo = { viewer, webdggrid }

    isReady.value = true
    status.value = props.showControls && !props.autoGenerate
      ? 'WASM loaded — click "Generate Grid"'
      : ''

    // in multi-resolution mode the slider is the maximum resolution (15)
    if (props.showControls && !ctrlMultiRes.value) {
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
  mobileQuery?.removeEventListener('change', onMobileChange)
  clearTimeout(multiResTimer)
  if (themeObserver) { themeObserver.disconnect(); themeObserver = null }
  if (viewer && cameraMoveEndCb) {
    viewer.camera.moveEnd.removeEventListener(cameraMoveEndCb)
    cameraMoveEndCb = null
  }
  if (pickHandler) { pickHandler.destroy(); pickHandler = null }
  if (viewer) { viewer.destroy(); viewer = null }
})

// Allow parent components (e.g. DggsHeroBackground) to access the Cesium
// viewer via the same getMap() handle the previous MapLibre version exposed.
defineExpose({ getMap: () => viewer })
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
        <input v-model="ctrlMixedAperture" type="checkbox" />
        Mixed aperture sequence
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
        <label>
          Sequence (digits 3, 4, 7)
          <span>{{ ctrlApertureSeq.length }} levels</span>
        </label>
        <input
          v-model="ctrlApertureSeq"
          type="text"
          placeholder="e.g. 434747"
          pattern="[347]*"
          class="aperture-seq-input"
        />
        <div class="aperture-seq-preview">
          <span
            v-for="(ch, i) in ctrlApertureSeq.split('')"
            :key="i"
            class="aperture-digit"
            :class="{ 'digit-3': ch === '3', 'digit-4': ch === '4', 'digit-7': ch === '7' }"
            :title="'Res ' + (i + 1) + ' → aperture ' + ch"
          >{{ ch }}</span>
        </div>
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

      <div class="field" style="margin-top: 5px">
        <label>Cell opacity <span>{{ Math.round(ctrlOpacity * 100) }}%</span></label>
        <input v-model.number="ctrlOpacity" type="range" min="0.05" max="0.95" step="0.05" />
      </div>

      <div class="field">
        <label>Basemap</label>
        <select v-model="ctrlBasemap">
          <option value="satellite">Sentinel-2 satellite</option>
          <option value="osm">OpenStreetMap</option>
          <option value="none">None</option>
        </select>
      </div>

      <div class="fly-row">
        <button @click="flyTo(0, 90, 1.6)">North Pole</button>
        <button @click="flyTo(0, -90, 1.6)">South Pole</button>
        <button @click="flyTo(props.initialCenter[0], props.initialCenter[1], props.initialZoom)">Globe</button>
      </div>

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
    <div v-if="showControls" v-show="!isMobile || openSheet === 'hierarchy'" class="dggs-hierarchy" :class="{ 'is-sheet': isMobile }">
      <div class="panel-head">
        <h3>Cell Hierarchy</h3>
        <button v-if="isMobile" class="sheet-close" aria-label="Close cell hierarchy" @click="openSheet = null">✕</button>
      </div>

      <div class="field">
        <label>Index Type</label>
        <select v-model="ctrlIndexType" @change="selectedCellId && selectCell(selectedCellId, selectedCellRes)">
          <option v-for="t in availableIndexTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <!-- Mixed aperture per-level display -->
      <div v-if="ctrlMixedAperture && showAperture" class="hier-group">
        <div class="hier-label">Aperture per level</div>
        <div class="aperture-seq-preview">
          <span
            v-for="(ch, i) in ctrlApertureSeq.split('')"
            :key="i"
            class="aperture-digit"
            :class="{ 'digit-3': ch === '3', 'digit-4': ch === '4', 'digit-7': ch === '7', 'digit-active': selectedCellRes !== null && i + 1 === selectedCellRes }"
            :title="'Res ' + (i + 1) + ' → aperture ' + ch"
          >{{ ch }}</span>
        </div>
      </div>

      <template v-if="selectedCellId">
        <div class="hier-cell-id">
          Selected: <strong>{{ selectedCellId.toString() }}</strong>
          <span class="hier-res">res {{ selectedCellRes }}<template v-if="ctrlMixedAperture && showAperture && ctrlApertureSeq[selectedCellRes - 1]"> (a{{ ctrlApertureSeq[selectedCellRes - 1] }})</template></span>
          <button class="hier-clear-btn" @click="clearSelection">Clear</button>
        </div>

        <div v-if="hierarchyInfo.allParents.length" class="hier-group">
          <div class="hier-label hier-parent-label">
            Parents ({{ hierarchyInfo.allParents.length }}, res {{ selectedCellRes - 1 }}<template v-if="ctrlMixedAperture && showAperture && ctrlApertureSeq[selectedCellRes - 2]">, a{{ ctrlApertureSeq[selectedCellRes - 2] }}</template>)
          </div>
          <div class="hier-chips">
            <span v-for="(p, i) in hierarchyInfo.allParents" :key="i" class="hier-chip hier-chip-parent" :class="{ 'hier-chip-primary': i === 0 }">{{ p.toString() }}<span v-if="i === 0" class="hier-primary-badge">primary</span></span>
          </div>
        </div>

        <div v-if="hierarchyInfo.children.length" class="hier-group">
          <div class="hier-label hier-child-label">
            Children ({{ hierarchyInfo.children.length }}, res {{ selectedCellRes + 1 }}<template v-if="ctrlMixedAperture && showAperture && ctrlApertureSeq[selectedCellRes]">, a{{ ctrlApertureSeq[selectedCellRes] }}</template>)
          </div>
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
      <div v-else class="hier-hint">{{ isTouch ? 'Tap' : 'Click' }} a cell on the map to inspect hierarchy</div>
    </div>

    <!-- Status bar -->
    <div v-if="status && (showControls || !isReady)" v-show="!(isMobile && openSheet)" class="dggs-status">
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
    background: var(--vp-c-bg-elv);
    color: var(--vp-c-text-1); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
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
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25);
    z-index: 15;
  }
  .is-sheet .field input[type='number'],
  .is-sheet .field select,
  .is-sheet .field input[type='text'] { font-size: 14px; padding: 6px 8px; }
  .is-sheet .field label,
  .is-sheet .field-inline { font-size: 13px; }
  .is-sheet .field-inline input[type='checkbox'] { width: 18px; height: 18px; }
  .is-sheet .generate-btn { font-size: 13px; padding: 10px; }
  .is-sheet .hier-chip { font-size: 12px; padding: 3px 7px; }

  /* status: top-left, may wrap, out of the toolbar's way */
  .dggs-status {
    top: 10px; bottom: auto; left: 10px; transform: none;
    max-width: calc(100% - 190px);
    white-space: normal; font-size: 11px; line-height: 1.3;
    padding: 6px 10px; border-radius: 12px;
  }

  /* keep Cesium's credit line small and out of the sheet's way */
  :deep(.cesium-widget-credits) { transform: scale(0.8); transform-origin: left bottom; }
}

.fly-row { display: flex; gap: 4px; margin-top: 6px; }
.fly-row button {
  flex: 1; font-size: 10px; padding: 3px 2px;
  border: 1px solid var(--vp-c-divider); border-radius: 3px;
  background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); cursor: pointer;
}
.fly-row button:hover { border-color: var(--vp-c-brand-1); }
@media (max-width: 768px) { .is-sheet .fly-row button { font-size: 12px; padding: 8px 4px; } }
</style>
