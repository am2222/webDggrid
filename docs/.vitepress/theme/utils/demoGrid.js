// Grid settings shared by the Cesium (DggsGlobe.vue) and Navara
// (DggsNavaraGlobe.vue) demos, so both panels offer the same options.
// SSR-safe: no DOM or WASM access at import time.

const ISEA = { poleCoordinates: { lat: 58.282525588538995, lng: 11.25 }, azimuth: 0 }
const ISEAL = { poleCoordinates: { lat: 58.282525588538995, lng: 11.2 }, azimuth: 0 }
const DYMAXION = { poleCoordinates: { lat: 64.70000012793489, lng: 10.536199075467637 }, azimuth: 125.68765089354628 }

/**
 * DGGRID presets offered in the demos (a subset of the library's
 * `dggsPreset()` names), resolved to grid settings. Values match
 * `dggsPreset(name)` in src-ts/webdggrid.ts.
 */
export const PRESETS = [
  { name: 'ISEA4H', label: 'ISEA4H', ...ISEA, projection: 'ISEA', topology: 'HEXAGON', aperture: 4, datum: 'AUTHALIC_SPHERE' },
  { name: 'ISEA3H', label: 'ISEA3H', ...ISEA, projection: 'ISEA', topology: 'HEXAGON', aperture: 3, datum: 'AUTHALIC_SPHERE' },
  { name: 'ISEA7H', label: 'ISEA7H', ...ISEA, projection: 'ISEA', topology: 'HEXAGON', aperture: 7, datum: 'AUTHALIC_SPHERE' },
  { name: 'IGEO7v2', label: 'IGEO7 (WGS84)', ...ISEAL, projection: 'ISEA', topology: 'HEXAGON', aperture: 7, datum: 'WGS84' },
  { name: 'IVEA4HS', label: 'IVEA4H', ...ISEA, projection: 'IVEA', topology: 'HEXAGON', aperture: 4, datum: 'AUTHALIC_SPHERE' },
  { name: 'ISEA4TSQ', label: 'ISEA4T (QUADTREE)', ...ISEA, projection: 'ISEA', topology: 'TRIANGLE', aperture: 4, datum: 'AUTHALIC_SPHERE' },
  { name: 'ISEA4DSZ', label: 'ISEA4D (ZORDER)', ...ISEA, projection: 'ISEA', topology: 'DIAMOND', aperture: 4, datum: 'AUTHALIC_SPHERE' },
  { name: 'FULLER4H', label: 'FULLER4H (Dymaxion)', ...DYMAXION, projection: 'FULLER', topology: 'HEXAGON', aperture: 4, datum: 'AUTHALIC_SPHERE' },
  { name: 'PLANETRISK', label: 'PLANETRISK (mixed)', ...ISEA, projection: 'ISEA', topology: 'HEXAGON', aperture: 4, apertureSequence: '43334777777777777777777', datum: 'AUTHALIC_SPHERE' },
]

export const PROJECTIONS = [
  { value: 'ISEA', label: 'ISEA' },
  { value: 'IVEA', label: 'IVEA' },
  { value: 'FULLER', label: 'Fuller' },
  { value: 'GNOMONIC', label: 'Gnomonic' },
]

export const DATUMS = [
  { value: 'AUTHALIC_SPHERE', label: 'Authalic sphere' },
  { value: 'WGS84', label: 'WGS84' },
]

/** Index types the hierarchy panel can show for a grid. */
export function indexTypesFor({ topology, aperture, mixed }) {
  const types = ['SEQNUM']
  if (topology === 'HEXAGON') {
    types.push('VERTEX2DD')
    if (!mixed) {
      if (aperture !== 7) types.push('ZORDER')
      if (aperture === 3) types.push('Z3')
      if (aperture === 7) types.push('Z7')
    }
  } else if (topology === 'DIAMOND') {
    types.push('ZORDER')     // DGGRID 9.3
  } else if (topology === 'TRIANGLE') {
    types.push('QUADTREE')   // DGGRID 9.3
  }
  return types
}

/**
 * A cell's label in the given index type. Packed hierarchical indexes are
 * shown in hex, as DGGRID prints them.
 */
export function indexLabel(dggs, type, seqnum, res) {
  try {
    switch (type) {
      case 'VERTEX2DD': {
        const v = dggs.sequenceNumToVertex2DD(seqnum, res)
        return `v${v.vertNum} t${v.triNum}`
      }
      case 'ZORDER':   return dggs.sequenceNumToZOrder(seqnum, res).toString(16)
      case 'Z3':       return dggs.sequenceNumToZ3(seqnum, res).toString(16)
      case 'Z7':       return dggs.sequenceNumToZ7(seqnum, res).toString(16)
      case 'QUADTREE': return dggs.sequenceNumToQuadtree(seqnum, res).toString(16)
      default:         return seqnum.toString()
    }
  } catch {
    return seqnum.toString()
  }
}

/** Cell styling shared by both demos (CSS colors). */
export const CELL_STYLE = {
  fill: '#3884ff',
  outline: '#8ec5ff',
  outlineColored: '#5c3a12',  // over YlOrBr fills
  base: '#f59e0b',            // coarser layer in multi-resolution mode
  parent: { fill: 'rgba(102,221,136,0.25)', outline: '#44bb66' },
  parentPrimary: { fill: 'rgba(34,204,85,0.35)', outline: '#11aa33' },
  child: { fill: 'rgba(255,204,0,0.3)', outline: '#cc9900' },
  selected: { fill: 'rgba(255,51,51,0.25)', outline: '#ff3333' },
}

// ---------------------------------------------------------------------------
// Multi-resolution: which cells to generate for the viewport, and when a
// camera move needs a new set. Extents are { minLng, maxLng, minLat, maxLat }
// in degrees; minLng..maxLng may run past ±180 (a span across the
// antimeridian) and covers every longitude when it is 360° or more.
// ---------------------------------------------------------------------------

export const WORLD = { minLng: -180, maxLng: 180, minLat: -89.9, maxLat: 89.9 }

/** The extent grown by `fraction` of its size on every side. */
export function padExtent(e, fraction) {
  const dLng = (e.maxLng - e.minLng) * fraction
  const dLat = (e.maxLat - e.minLat) * fraction
  const full = e.maxLng - e.minLng + 2 * dLng >= 360
  return {
    minLng: full ? -180 : e.minLng - dLng,
    maxLng: full ? 180 : e.maxLng + dLng,
    minLat: Math.max(-89.9, e.minLat - dLat),
    maxLat: Math.min(89.9, e.maxLat + dLat),
  }
}

/** True if `inner` lies inside `outer`. */
export function extentContains(outer, inner) {
  if (inner.minLat < outer.minLat || inner.maxLat > outer.maxLat) return false
  if (outer.maxLng - outer.minLng >= 360) return true
  if (inner.maxLng - inner.minLng >= 360) return false
  // move inner's longitudes into the 360° window that starts at outer.minLng
  let lo = inner.minLng
  while (lo < outer.minLng) lo += 360
  while (lo >= outer.minLng + 360) lo -= 360
  return lo + (inner.maxLng - inner.minLng) <= outer.maxLng
}

/**
 * The cells of `dggs` at `res` covering `extent`, found by sampling a grid of
 * points. `steps` points per side sample a viewport-sized extent; larger
 * (padded) extents get proportionally more so cells are not skipped.
 */
export function extentSeqNums(dggs, res, extent, steps) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      let lng = extent.minLng + (extent.maxLng - extent.minLng) * j / steps
      while (lng > 180) lng -= 360
      while (lng < -180) lng += 360
      coords.push([lng, extent.minLat + (extent.maxLat - extent.minLat) * i / steps])
    }
  }
  const seen = new Set(), out = []
  for (const n of dggs.geoToSequenceNum(coords, res)) {
    const k = n.toString()
    if (!seen.has(k)) { seen.add(k); out.push(n) }
  }
  return out
}
