<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { loadWebdggrid } from '../utils/loadWebdggrid.js'

// Interactive demo for the two authalic use cases:
//   1. Cell area on the WGS84 ellipsoid vs the authalic sphere — shows the
//      mismatch between "DGGRID's claimed equal-area cells" and what flat
//      planar area on geodetic coords gives you.
//   2. Visual diff: pick a latitude, render the authalic shift on a
//      tiny inline map (just text, no globe) — biggest at ±45°, zero at
//      poles and equator.

const state = reactive({
  ready: false,
  loading: true,
  error: null,
  testLat: 45,
  resolution: 5,
  // amplification factor for the shape-distortion overlay.
  // 1× shows reality (rings nearly coincide with a small lat offset).
  // ≥100× makes the *shape* difference (not just the lat shift) visible.
  amplify: 200,
  // when true, subtract the per-cell mean lat shift before amplifying so
  // the user sees the *shape* component of the diff, not the bulk shift.
  subtractMeanShift: true,
  cellId: null,
  geoArea: null,
  authArea: null,
  shift: null,
  vertices: null,
  vertsAuth: null,
  cellAreaKm: null,
  edgesGeo: null,
  edgesAuth: null,
})

let dggs = null

// WGS84 mean Earth radius — for sphere-area from steradians.
const R_WGS84_AUTH_M = 6371007.181

// Compute spherical excess of a polygon on the unit sphere (Girard's theorem).
// Returns area in steradians.
function sphericalExcess(ring) {
  // Convert to 3D unit vectors.
  const toVec = ([lng, lat]) => {
    const lr = lng * Math.PI / 180
    const tr = lat * Math.PI / 180
    return [Math.cos(tr) * Math.cos(lr), Math.cos(tr) * Math.sin(lr), Math.sin(tr)]
  }
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
  const norm = a => { const m = Math.hypot(a[0], a[1], a[2]); return [a[0]/m, a[1]/m, a[2]/m] }

  const verts = ring.map(toVec)
  let total = 0
  const n = verts.length
  for (let i = 0; i < n; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % n]
    const c = verts[(i + 2) % n]
    // Interior angle at b between great circles ba and bc:
    //   angle = atan2(|n1 × n2|, n1 · n2) where n1,n2 are normals to those circles.
    const n1 = norm(cross(a, b))
    const n2 = norm(cross(b, c))
    const angle = Math.acos(Math.max(-1, Math.min(1, -dot(n1, n2))))
    total += angle
  }
  // Spherical excess = sum(angles) - (n-2)π
  return total - (n - 2) * Math.PI
}

// Planar (shoelace) area on flat lng/lat — i.e. what you get if you forget
// the sphere and treat coordinates as 2D. Wrong but illustrative.
function planarArea(ring) {
  let s = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    s += (x1 * y2 - x2 * y1)
  }
  return Math.abs(s) / 2 // square degrees
}

onMounted(async () => {
  try {
    const Webdggrid = await loadWebdggrid()
    dggs = await Webdggrid.load()
    state.ready = true
    state.loading = false
    recompute()
  } catch (e) {
    state.error = e?.message ?? String(e)
    state.loading = false
  }
})

function recompute() {
  if (!dggs) return
  state.error = null
  try {
    // Find a cell at the requested latitude, on the prime meridian.
    const seqs = dggs.geoToSequenceNum([[0, state.testLat]], state.resolution)
    const cell = seqs[0]
    state.cellId = cell.toString()

    // The cell ring (lon, lat) — DGGRID-native order, no unwrap.
    const ring = dggs.sequenceNumToGrid([cell], state.resolution, false)[0]

    // Authalic-shifted ring (latitudes only).
    const ringA = ring.map(([lng, lat]) => [lng, dggs.igeo7GeoToAuthalic(lat)])

    state.vertices = ring
    state.vertsAuth = ringA
    state.shift = ring.map(([_, lat]) => dggs.igeo7GeoToAuthalic(lat) - lat)

    // Area via Girard on each ring × authalic radius².
    const exG = sphericalExcess(ring)
    const exA = sphericalExcess(ringA)
    state.geoArea  = (exG * R_WGS84_AUTH_M ** 2) / 1e6 // km²
    state.authArea = (exA * R_WGS84_AUTH_M ** 2) / 1e6

    // DGGRID's reported uniform cell area at this resolution (km²).
    state.cellAreaKm = dggs.cellAreaKM(state.resolution)

    // Edge lengths (great-circle, on the authalic sphere) for both rings.
    // Useful to confirm the shape effect: even a polar cap's edges change
    // length under the conversion by a fraction of a percent.
    state.edgesGeo  = ringEdgeLengths(ring)
    state.edgesAuth = ringEdgeLengths(ringA)
  } catch (e) {
    state.error = e?.message ?? String(e)
  }
}

// Great-circle edge lengths on the authalic-radius sphere (km).
function ringEdgeLengths(ring) {
  const R = R_WGS84_AUTH_M / 1000
  const out = []
  const toRad = d => d * Math.PI / 180
  for (let i = 0; i < ring.length; i++) {
    const [l1, p1] = ring[i]
    const [l2, p2] = ring[(i + 1) % ring.length]
    const sinHalfDLat = Math.sin(toRad(p2 - p1) / 2)
    const sinHalfDLon = Math.sin(toRad(l2 - l1) / 2)
    const a = sinHalfDLat ** 2 + Math.cos(toRad(p1)) * Math.cos(toRad(p2)) * sinHalfDLon ** 2
    out.push(2 * R * Math.asin(Math.min(1, Math.sqrt(a))))
  }
  return out
}

// SVG view of the cell — overlays the geodetic ring (blue) and the
// authalic ring (orange). When `amplify > 1`, the orange ring's per-vertex
// lat is exaggerated so the shape distortion is visible at human scales.
const svgView = computed(() => {
  if (!state.vertices) return null
  const ring = state.vertices
  const ringA = state.vertsAuth
  const meanShift = state.subtractMeanShift
    ? state.shift.reduce((a, b) => a + b, 0) / state.shift.length
    : 0
  const amplify = Math.max(1, state.amplify)

  // Build the amplified ring: take the residual (per-vertex shift minus
  // mean), multiply by amplify, add back to geodetic lat. This visually
  // separates *shape change* from *bulk shift*.
  const ringAmp = ring.map(([lng, lat], i) => {
    const dRes = (ringA[i][1] - lat) - meanShift
    return [lng, lat + meanShift + dRes * amplify]
  })

  // Project lng/lat to flat SVG coords with margin.
  const allLng = [...ring, ...ringAmp].map(v => v[0])
  const allLat = [...ring, ...ringAmp].map(v => v[1])
  const lngMin = Math.min(...allLng), lngMax = Math.max(...allLng)
  const latMin = Math.min(...allLat), latMax = Math.max(...allLat)
  const lngRange = Math.max(1e-6, lngMax - lngMin)
  const latRange = Math.max(1e-6, latMax - latMin)
  const W = 360, H = 240, PAD = 24
  const sx = (W - 2 * PAD) / lngRange
  const sy = (H - 2 * PAD) / latRange
  const s = Math.min(sx, sy)
  const cx = (lngMin + lngMax) / 2
  const cy = (latMin + latMax) / 2
  const project = ([lng, lat]) => [
    (W / 2) + (lng - cx) * s,
    (H / 2) - (lat - cy) * s,
  ]
  const path = pts => pts.map(p => project(p)).map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2)).join(' ') + ' Z'
  return {
    width: W,
    height: H,
    geoPath:  path(ring),
    authPath: path(ringAmp),
    geoPts:   ring.map(project),
    authPts:  ringAmp.map(project),
  }
})

const maxShift = computed(() =>
  state.shift ? Math.max(...state.shift.map(Math.abs)) : 0
)
</script>

<template>
  <div class="auth-demo">
    <div v-if="state.loading" class="status">Loading WebDggrid WASM…</div>
    <div v-else-if="state.error && !state.ready" class="status error">
      Failed to load: {{ state.error }}
    </div>
    <template v-else>
      <div class="controls">
        <label>
          <span>Test latitude</span>
          <input v-model.number="state.testLat" type="range" min="-89" max="89" step="1" @input="recompute" />
          <strong>{{ state.testLat }}°</strong>
        </label>
        <label>
          <span>Resolution</span>
          <input v-model.number="state.resolution" type="range" min="1" max="8" step="1" @input="recompute" />
          <strong>{{ state.resolution }}</strong>
        </label>
      </div>

      <div v-if="state.error" class="status error">{{ state.error }}</div>

      <div v-if="state.cellId" class="grid">
        <section class="card">
          <h4>Cell at ({{ 0 }}°, {{ state.testLat }}°)</h4>
          <table class="kv">
            <tbody>
              <tr><th>Cell ID</th><td><code>{{ state.cellId }}</code></td></tr>
              <tr><th>DGGRID claimed area</th><td>{{ state.cellAreaKm.toFixed(4) }} km²</td></tr>
              <tr>
                <th>Area (geodetic vertices, Girard)</th>
                <td>{{ state.geoArea.toFixed(4) }} km²</td>
              </tr>
              <tr>
                <th>Area (authalic vertices, Girard)</th>
                <td>{{ state.authArea.toFixed(4) }} km²</td>
              </tr>
              <tr>
                <th>Geo / authalic ratio</th>
                <td>{{ (state.geoArea / state.authArea).toFixed(6) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="hint">
            DGGRID emits cells that are equal-area on the <em>authalic</em>
            sphere. Computing area from the raw lat/lng vertices on a
            uniform-radius sphere gives a slightly different number; the
            authalic-shifted version recovers the equal-area property.
          </p>
        </section>

        <section class="card">
          <h4>Per-vertex latitude shift (geo → authalic)</h4>
          <table class="rows">
            <thead><tr><th>i</th><th>lng</th><th>geo lat</th><th>authalic lat</th><th>Δ</th></tr></thead>
            <tbody>
              <tr v-for="(v, i) in state.vertices" :key="i">
                <td>{{ i }}</td>
                <td><code>{{ v[0].toFixed(2) }}</code></td>
                <td><code>{{ v[1].toFixed(4) }}</code></td>
                <td><code>{{ state.vertsAuth[i][1].toFixed(4) }}</code></td>
                <td :class="{ pos: state.shift[i] > 0, neg: state.shift[i] < 0 }">
                  {{ state.shift[i].toFixed(4) }}°
                </td>
              </tr>
            </tbody>
          </table>
          <p class="hint">
            Max |Δ| at this cell: <strong>{{ maxShift.toFixed(4) }}°</strong>.
            The shift peaks near ±45° and is zero at the equator and poles.
          </p>
        </section>

        <section class="card shape-card">
          <h4>Shape comparison (geodetic vs authalic)</h4>
          <div class="shape-controls">
            <label>
              <span>Amplify shape diff</span>
              <input v-model.number="state.amplify" type="range" min="1" max="2000" step="1" />
              <strong>{{ state.amplify }}×</strong>
            </label>
            <label class="inline">
              <input v-model="state.subtractMeanShift" type="checkbox" />
              Subtract bulk lat shift (show shape change only)
            </label>
          </div>
          <svg v-if="svgView" :viewBox="`0 0 ${svgView.width} ${svgView.height}`" class="shape-svg" preserveAspectRatio="xMidYMid meet">
            <path :d="svgView.geoPath"  class="ring-geo"  />
            <path :d="svgView.authPath" class="ring-auth" />
            <circle v-for="(p, i) in svgView.geoPts"  :key="'g'+i" :cx="p[0]" :cy="p[1]" r="2.5" class="vert-geo"  />
            <circle v-for="(p, i) in svgView.authPts" :key="'a'+i" :cx="p[0]" :cy="p[1]" r="2.5" class="vert-auth" />
          </svg>
          <p class="hint">
            <span class="legend ring-geo-legend">geodetic</span>
            <span class="legend ring-auth-legend">authalic</span>
            (vertices marked). At <strong>1×</strong> the rings essentially
            coincide — the conversion is a near-pure latitude translation
            for any cell that doesn't span much latitude. With "subtract
            bulk shift" on and amplification ≥100, what's left is the *shape
            distortion* — the part where vertices at different lats shift by
            slightly different amounts because <code>dξ/dφ</code> is non-
            constant. It's small, but it's not zero.
          </p>
        </section>

        <section class="card edge-card">
          <h4>Edge lengths (km, on authalic-radius sphere)</h4>
          <table class="rows">
            <thead><tr><th>edge</th><th>geo</th><th>authalic</th><th>Δ%</th></tr></thead>
            <tbody>
              <tr v-for="(g, i) in state.edgesGeo" :key="i">
                <td>{{ i }}</td>
                <td><code>{{ g.toFixed(3) }}</code></td>
                <td><code>{{ state.edgesAuth[i].toFixed(3) }}</code></td>
                <td :class="{ pos: state.edgesAuth[i] > g, neg: state.edgesAuth[i] < g }">
                  {{ ((state.edgesAuth[i] - g) / g * 100).toFixed(4) }}%
                </td>
              </tr>
            </tbody>
          </table>
          <p class="hint">
            If the conversion were a pure rigid translation, every edge would
            change length identically. The non-uniform Δ% is direct evidence
            of shape distortion (north–south edges shrink/stretch differently
            from east–west edges).
          </p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.auth-demo { margin: 1.25rem 0; font-size: 0.92rem; }
.status { padding: 0.75rem 1rem; border-radius: 6px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); }
.status.error { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); border: 1px solid var(--vp-c-warning-2); }

.controls {
  display: flex; flex-wrap: wrap; gap: 1rem;
  padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px;
  margin-bottom: 1rem;
}
.controls label {
  display: flex; flex-direction: column; gap: 0.3rem;
  flex: 1; min-width: 220px;
}
.controls label > span { font-size: 0.85rem; color: var(--vp-c-text-2); }
.controls label > strong { color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); }

.grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
.card { border: 1px solid var(--vp-c-border); border-radius: 8px; padding: 1rem; background: var(--vp-c-bg); }
.card h4 { margin: 0 0 0.75rem 0; font-size: 1rem; }

table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.kv th, .kv td, .rows th, .rows td {
  padding: 0.3rem 0.5rem; text-align: left;
  border-bottom: 1px solid var(--vp-c-divider); vertical-align: top;
}
.kv th { color: var(--vp-c-text-2); width: 50%; }
.rows thead th { font-size: 0.78rem; color: var(--vp-c-text-2); border-bottom: 2px solid var(--vp-c-divider); }
.rows td.pos { color: #2da44e; }
.rows td.neg { color: #d1242f; }
.hint { margin: 0.6rem 0 0 0; font-size: 0.8rem; color: var(--vp-c-text-2); }
code { font-family: var(--vp-font-family-mono); font-size: 0.85rem; }

.shape-card { grid-column: 1 / -1; }
.edge-card  { grid-column: 1 / -1; }

.shape-controls {
  display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; align-items: center;
  margin-bottom: 0.75rem;
}
.shape-controls label {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.85rem; color: var(--vp-c-text-2);
}
.shape-controls label.inline { gap: 0.35rem; cursor: pointer; }
.shape-controls input[type='range'] { width: 180px; accent-color: var(--vp-c-brand-1); }
.shape-controls strong { color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); min-width: 3.5em; text-align: right; }

.shape-svg {
  display: block; width: 100%; max-width: 480px; margin: 0 auto;
  background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 4px;
}
.ring-geo  { fill: rgba(51, 136, 255, 0.10); stroke: #3388ff; stroke-width: 1.5; }
.ring-auth { fill: none;                       stroke: #ec7014; stroke-width: 1.5; stroke-dasharray: 4 3; }
.vert-geo  { fill: #3388ff; }
.vert-auth { fill: #ec7014; }
.legend {
  display: inline-flex; align-items: center; gap: 0.35rem; margin-right: 0.85rem;
  font-weight: 600;
}
.legend::before { content: ''; display: inline-block; width: 14px; height: 2px; }
.ring-geo-legend  { color: #3388ff; }
.ring-geo-legend::before  { background: #3388ff; }
.ring-auth-legend { color: #ec7014; }
.ring-auth-legend::before { background: #ec7014; }
</style>
