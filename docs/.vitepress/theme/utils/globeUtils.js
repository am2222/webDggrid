// Pure coordinate-processing utilities — no DOM/browser deps, SSR-safe.

export const YLORBR_RGB = [
  [255, 255, 229],
  [255, 247, 188],
  [254, 227, 145],
  [254, 196,  79],
  [254, 153,  41],
  [236, 112,  20],
  [204,  76,   2],
  [153,  52,   4],
  [102,  37,   6],
]

export function ylOrBrRgba(t, alpha) {
  const n = YLORBR_RGB.length - 1
  const i = Math.min(Math.floor(t * n), n - 1)
  const f = t * n - i
  const a = YLORBR_RGB[i]
  const b = YLORBR_RGB[i + 1]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    alpha,
  ]
}

// Cast a ray from the geographic pole and count edge crossings (ray-casting).
// Edges are interpreted as shortest-path (mirrors deck.gl wrapLongitude).
export function containsGeographicPole(ring, isNorth) {
  const testLng = 1e-6
  const poleLat = isNorth ? 90 : -90
  let crossings = 0
  const n = ring.length

  for (let i = 0; i < n; i++) {
    let x1 = ring[i][0],            y1 = ring[i][1]
    let x2 = ring[(i + 1) % n][0],  y2 = ring[(i + 1) % n][1]

    let dx = x2 - x1
    if      (dx >  180) { x2 -= 360; dx -= 360 }
    else if (dx < -180) { x2 += 360; dx += 360 }
    if (Math.abs(dx) < 1e-10) continue

    const lo = Math.min(x1, x2)
    const hi = Math.max(x1, x2)
    let t = testLng
    while (t < lo - 180) t += 360
    while (t > hi + 180) t -= 360
    if (t < lo || t >= hi) continue

    const crossLat = y1 + (t - x1) / dx * (y2 - y1)
    if (isNorth ? crossLat < poleLat : crossLat > poleLat) crossings++
  }
  return crossings % 2 === 1
}

// Fix a single ring: unwrap from [0°,360°] to [-180°,180°], normalise to
// centroid, and inject a pole vertex if the ring encircles a geographic pole.
export function processRingForGlobe(ring) {
  if (!ring.length) return ring

  ring = ring.map(([lng, lat]) => [lng > 180 ? lng - 360 : lng, lat])

  let sx = 0, sy = 0
  for (const [lng] of ring) {
    const rad = lng * Math.PI / 180
    sx += Math.cos(rad)
    sy += Math.sin(rad)
  }
  const centerLng = (Math.abs(sx) < 1e-10 && Math.abs(sy) < 1e-10)
    ? ring[0][0]
    : Math.atan2(sy, sx) * 180 / Math.PI

  ring = ring.map(([lng, lat]) => {
    let d = lng - centerLng
    while (d >  180) d -= 360
    while (d < -180) d += 360
    return [centerLng + d, lat]
  })

  if (containsGeographicPole(ring, false)) return [[centerLng, -90], ...ring]
  if (containsGeographicPole(ring, true))  return [[centerLng,  90], ...ring]
  return ring
}

export function processFcForGlobe(fc) {
  for (const f of fc.features) {
    f.geometry.coordinates = f.geometry.coordinates.map(processRingForGlobe)
  }
  return fc
}
