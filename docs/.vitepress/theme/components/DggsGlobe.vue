<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ylOrBrRgba } from '../utils/globeUtils.js'
import { loadWebdggrid } from '../utils/loadWebdggrid.js'

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
  /** Equivalent MapLibre globe zoom level — mapped to a Cesium camera altitude. */
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
const ctrlMixedAperture = ref(false)
const ctrlApertureSeq   = ref('434747')

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

// webDggrid pre-applies unwrapAntimeridianRing for MapLibre's globe projection,
// which produces longitudes outside [-180, 180]. Cesium expects standard
// coordinates and does its own geodesic interpolation, so we reverse the unwrap
// before handing the FeatureCollection to GeoJsonDataSource.
function rewrapRing(ring) {
  return ring.map(([lon, lat]) => {
    let l = lon
    while (l > 180) l -= 360
    while (l < -180) l += 360
    return [l, lat]
  })
}

function preprocessFc(fc) {
  for (const f of fc.features) {
    if (f.geometry?.type === 'Polygon') {
      f.geometry.coordinates = f.geometry.coordinates.map(rewrapRing)
    } else if (f.geometry?.type === 'MultiPolygon') {
      f.geometry.coordinates = f.geometry.coordinates.map(p => p.map(rewrapRing))
    }
  }
  return fc
}

function rgbaArrayToCesium([r, g, b, a]) {
  return Cesium.Color.fromBytes(r, g, b, a ?? 255)
}

// Map MapLibre-style globe zoom levels to a sensible Cesium camera altitude
// so the existing `initialZoom` prop and the multi-res zoom-offset slider keep
// working without changing their meaning.
function altitudeFromZoom(zoom) {
  return 40_000_000 * Math.pow(2, -zoom)
}

function zoomFromAltitude() {
  if (!viewer) return 0
  const h = viewer.camera.positionCartographic.height
  return Math.log2(40_000_000 / Math.max(h, 1))
}

// ---------------------------------------------------------------------------
// Cesium layer helpers
// ---------------------------------------------------------------------------

async function buildCellDataSource(fc, { fill, stroke, isBase, colored }) {
  const ds = await Cesium.GeoJsonDataSource.load(fc, {
    fill: rgbaArrayToCesium(fill),
    stroke: rgbaArrayToCesium(stroke),
    strokeWidth: isBase ? 2 : 1,
    clampToGround: false,
  })

  const baseFill = rgbaArrayToCesium(fill)

  ds.entities.values.forEach((e) => {
    if (!e.polygon) return
    e.polygon.arcType = Cesium.ArcType.GEODESIC
    e.polygon.height  = 0
    e.polygon.outline = true
    if (isBase) {
      e.polygon.fill = false
    } else if (colored) {
      const t = Number(e.properties?.colorValue?.getValue?.() ?? 0)
      e.polygon.material = rgbaArrayToCesium(ylOrBrRgba(t, 179))
    } else {
      e.polygon.material = baseFill
    }
  })

  return ds
}

async function updateLayers(fineFc, baseFc) {
  if (!viewer) return
  const colored = ctrlColorCells.value

  if (gridDataSource) { viewer.dataSources.remove(gridDataSource, true); gridDataSource = null }
  if (baseDataSource) { viewer.dataSources.remove(baseDataSource, true); baseDataSource = null }

  if (baseFc) {
    baseDataSource = await buildCellDataSource(baseFc, {
      fill:    [0, 0, 0, 0],
      stroke:  [245, 158, 11, 220],
      isBase:  true,
      colored: false,
    })
    await viewer.dataSources.add(baseDataSource)
  }
  if (fineFc) {
    gridDataSource = await buildCellDataSource(fineFc, {
      fill:    props.fillColor,
      stroke:  props.lineColor,
      isBase:  false,
      colored,
    })
    await viewer.dataSources.add(gridDataSource)
  }
}

// ---------------------------------------------------------------------------
// Multi-res helpers
// ---------------------------------------------------------------------------

function zoomToResolution(zoom, maxRes) {
  const res = Math.round(zoom) + ctrlZoomOffset.value
  return Math.min(maxRes, Math.max(1, res))
}

function viewportSeqNums(resolution) {
  const rect = viewer.camera.computeViewRectangle()
  let minLng, maxLng, minLat, maxLat
  if (rect) {
    minLng = Cesium.Math.toDegrees(rect.west)
    maxLng = Cesium.Math.toDegrees(rect.east)
    minLat = Math.max(Cesium.Math.toDegrees(rect.south), -89)
    maxLat = Math.min(Cesium.Math.toDegrees(rect.north),  89)
    if (maxLng < minLng) maxLng += 360 // antimeridian-crossing rectangle
  } else {
    // Camera is looking past the globe edge (whole-world view). Sample the
    // entire world instead of trying to enumerate every cell at this
    // resolution — at res 15 that's billions of cells and traps the WASM
    // module ("RuntimeError: null function").
    minLng = -180; maxLng = 180; minLat = -89; maxLat = 89
  }

  const steps   = 80
  const latStep = (maxLat - minLat) / steps
  const lngStep = (maxLng - minLng) / steps

  const coords = []
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      let lng = minLng + j * lngStep
      while (lng >  180) lng -= 360
      while (lng < -180) lng += 360
      coords.push([lng, minLat + i * latStep])
    }
  }

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
  hierarchyInfo.allParents = []
  hierarchyInfo.children = []
  hierarchyInfo.neighbors = []
  removeHierarchyLayers()

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
  }
  if (isMixed) dggsConfig.apertureSequence = ctrlApertureSeq.value

  webdggrid.setDggs(dggsConfig, resolution)

  ctrlResolution.value = resolution
  status.value = 'Generating grid…'
  if (!multiRes) isGenerating.value = true

  setTimeout(async () => {
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
        return preprocessFc(fc)
      }

      let seqNums
      let baseFc = null

      if (multiRes) {
        seqNums = viewportSeqNums(resolution)

        const baseRes = Math.max(1, resolution - 1)
        webdggrid.setDggs(dggsConfig, baseRes)
        const baseSeqNums = viewportSeqNums(baseRes)
        baseFc = buildFc(baseSeqNums, baseRes)

        webdggrid.setDggs(dggsConfig, resolution)
      } else {
        const total = webdggrid.nCells(resolution)
        seqNums = Array.from({ length: total }, (_, i) => BigInt(i + 1))
      }

      const fineFc = buildFc(seqNums, resolution)
      lastFineFc = fineFc
      lastBaseFc = baseFc
      await updateLayers(fineFc, baseFc)

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

watch(ctrlColorCells, () => {
  if (isReady.value) updateLayers(lastFineFc, lastBaseFc)
})

watch(ctrlZoomOffset, () => {
  if (isReady.value && webdggrid) generateGrid()
})

watch([ctrlPoleLng, ctrlPoleLat], () => {
  if (poleEntity) {
    poleEntity.position = Cesium.Cartesian3.fromDegrees(ctrlPoleLng.value, ctrlPoleLat.value)
  }
})

watch(ctrlMultiRes, (on) => {
  ctrlMaxResLabel.value = on ? 'Max Resolution' : 'Resolution'
  if (on) {
    ctrlResolution.value = 15
  } else {
    if (ctrlResolution.value > 5) ctrlResolution.value = 5
  }
  if (viewer) {
    if (cameraMoveEndCb) {
      viewer.camera.moveEnd.removeEventListener(cameraMoveEndCb)
      cameraMoveEndCb = null
    }
    if (on) {
      cameraMoveEndCb = onMoveEnd
      viewer.camera.moveEnd.addEventListener(cameraMoveEndCb)
    }
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
      const parentFc = preprocessFc(sanitizeFc(
        webdggrid.sequenceNumToGridFeatureCollection(hierarchyInfo.allParents, resolution - 1)
      ))
      parentFc.features.forEach((f, i) => { f.properties._primary = i === 0 })

      parentDataSource = await Cesium.GeoJsonDataSource.load(parentFc, { clampToGround: false })
      parentDataSource.entities.values.forEach((e) => {
        if (!e.polygon) return
        const isPrimary = !!e.properties?._primary?.getValue?.()
        e.polygon.arcType  = Cesium.ArcType.GEODESIC
        e.polygon.height   = 0
        e.polygon.material = Cesium.Color.fromCssColorString(isPrimary ? 'rgba(34,204,85,0.35)' : 'rgba(102,221,136,0.25)')
        e.polygon.outline  = true
        e.polygon.outlineColor = Cesium.Color.fromCssColorString(isPrimary ? '#11aa33' : '#44bb66')
        e.polygon.outlineWidth = isPrimary ? 3.5 : 2.5
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
      const childFc = preprocessFc(sanitizeFc(
        webdggrid.sequenceNumToGridFeatureCollection(hierarchyInfo.children, resolution + 1)
      ))
      childrenDataSource = await Cesium.GeoJsonDataSource.load(childFc, { clampToGround: false })
      childrenDataSource.entities.values.forEach((e) => {
        if (!e.polygon) return
        e.polygon.arcType  = Cesium.ArcType.GEODESIC
        e.polygon.height   = 0
        e.polygon.material = Cesium.Color.fromCssColorString('rgba(255,204,0,0.3)')
        e.polygon.outline  = true
        e.polygon.outlineColor = Cesium.Color.fromCssColorString('#cc9900')
        e.polygon.outlineWidth = 2
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
    const centerFc = preprocessFc(sanitizeFc(
      webdggrid.sequenceNumToGridFeatureCollection([seqnum], resolution)
    ))
    selectedDataSource = await Cesium.GeoJsonDataSource.load(centerFc, { clampToGround: false })
    selectedDataSource.entities.values.forEach((e) => {
      if (!e.polygon) return
      e.polygon.arcType  = Cesium.ArcType.GEODESIC
      e.polygon.height   = 0
      e.polygon.material = Cesium.Color.fromCssColorString('rgba(255,51,51,0.25)')
      e.polygon.outline  = true
      e.polygon.outlineColor = Cesium.Color.fromCssColorString('#ff3333')
      e.polygon.outlineWidth = 4
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

    const isDark = document.documentElement.classList.contains('dark')
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--vp-c-bg').trim() || (isDark ? '#1b1b1f' : '#ffffff')

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
    })

    if (props.showBasemap) {
      viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
        credit: '© OpenStreetMap contributors',
      }))
    } else {
      // No basemap — paint the globe & background to match the page theme.
      const themed = Cesium.Color.fromCssColorString(bgColor)
      viewer.scene.globe.baseColor   = themed
      viewer.scene.backgroundColor   = themed
      viewer.scene.skyAtmosphere.show = false
      if (viewer.scene.skyBox) viewer.scene.skyBox.show = false
    }
    viewer.scene.globe.enableLighting = false

    if (!props.interactive) {
      const c = viewer.scene.screenSpaceCameraController
      c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = false
    }

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        props.initialCenter[0],
        props.initialCenter[1],
        altitudeFromZoom(props.initialZoom),
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
      pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

      pickHandler.setInputAction((event) => {
        const picked = viewer.scene.pick(event.endPosition)
        const isCell = picked && picked.id && picked.id.entityCollection?.owner === gridDataSource && picked.id.polygon
        if (isCell) {
          if (tooltipEl.value) {
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

    isReady.value = true
    status.value = props.showControls && !props.autoGenerate
      ? 'WASM loaded — click "Generate Grid"'
      : ''

    if (props.showControls) {
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
</style>
