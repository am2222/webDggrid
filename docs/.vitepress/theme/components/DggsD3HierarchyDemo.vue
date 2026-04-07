<script setup>
import { onMounted, reactive, ref } from 'vue'

const svgRef = ref(null)
const info = ref('')
const state = reactive({
  ready: false,
  loading: true,
  selectedCell: null,
  selectedRes: null,
  parentCell: null,
  childrenCells: [],
  neighborCells: [],
  addressInfo: null,
  history: [],
})

let dggs = null
let d3 = null
let currentProjection = null

onMounted(async () => {
  await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js')
  const { Webdggrid } = await import('webdggrid')
  dggs = await Webdggrid.load()
  dggs.setDggs({
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    aperture: 4,
    topology: 'HEXAGON',
    projection: 'ISEA',
  }, 5)
  d3 = window.d3
  state.ready = true
  state.loading = false

  // Start with a random cell
  const startCell = BigInt(Math.floor(Math.random() * 10000))
  selectCell(startCell, 5)
})

function selectCell(cellId, resolution) {
  if (!dggs || !d3) return

  state.selectedCell = cellId
  state.selectedRes = resolution

  // Get hierarchical data
  state.neighborCells = dggs.sequenceNumNeighbors([cellId], resolution)[0]
  state.parentCell = resolution > 0 ? dggs.sequenceNumParent([cellId], resolution)[0] : null
  state.childrenCells = dggs.sequenceNumChildren([cellId], resolution)[0]

  // Get address conversions
  try {
    const v2dd = dggs.sequenceNumToVertex2DD(cellId, resolution)
    const zorder = dggs.sequenceNumToZOrder(cellId, resolution)
    state.addressInfo = { vertex2dd: v2dd, zorder }
  } catch {
    state.addressInfo = null
  }

  drawScene(cellId, resolution)
}

function drawScene(cellId, resolution) {
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('width', 640).attr('height', 440)

  // Collect geometries
  const centerGeom = dggs.sequenceNumToGridFeatureCollection([cellId], resolution)
  const neighborGeom = dggs.sequenceNumToGridFeatureCollection(state.neighborCells, resolution)
  const childrenGeom = dggs.sequenceNumToGridFeatureCollection(state.childrenCells, resolution + 1)

  let parentGeom = null
  if (state.parentCell !== null && resolution > 0) {
    parentGeom = dggs.sequenceNumToGridFeatureCollection([state.parentCell], resolution - 1)
  }

  const features = []
  if (parentGeom) {
    features.push(...parentGeom.features.map(f => ({ ...f, _type: 'parent', _res: resolution - 1 })))
  }
  features.push(...neighborGeom.features.map(f => ({ ...f, _type: 'neighbor', _res: resolution })))
  features.push(...centerGeom.features.map(f => ({ ...f, _type: 'center', _res: resolution })))
  features.push(...childrenGeom.features.map(f => ({ ...f, _type: 'child', _res: resolution + 1 })))

  // Compute bounding box for auto-fit
  const allCoords = features.flatMap(f => f.geometry.coordinates[0])

  const lngs = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)

  const pad = 30
  const w = 640 - pad * 2
  const h = 440 - pad * 2
  const scaleX = w / (maxLng - minLng || 1)
  const scaleY = h / (maxLat - minLat || 1)
  const scale = Math.min(scaleX, scaleY)

  const cx = (minLng + maxLng) / 2
  const cy = (minLat + maxLat) / 2

  currentProjection = ([lng, lat]) => [320 + (lng - cx) * scale, 220 - (lat - cy) * scale]

  const colorMap = {
    parent: '#33cc33',
    neighbor: '#3399ff',
    center: '#ff3333',
    child: '#ffcc00',
  }

  const opacityMap = {
    parent: 0.3,
    neighbor: 0.85,
    center: 1,
    child: 0.6,
  }

  svg.selectAll('polygon')
    .data(features)
    .enter()
    .append('polygon')
    .attr('points', d => d.geometry.coordinates[0].map(c => currentProjection(c)).join(' '))
    .attr('fill', d => colorMap[d._type])
    .attr('stroke', '#222')
    .attr('stroke-width', d => d._type === 'center' ? 2.5 : 1)
    .attr('opacity', d => opacityMap[d._type])
    .attr('cursor', d => (d._type !== 'center') ? 'pointer' : 'default')
    .on('mouseover', function (_event, d) {
      const label = d._type.charAt(0).toUpperCase() + d._type.slice(1)
      info.value = `${label} — ID: ${d.properties?.seqnum ?? d.id ?? '?'} (res ${d._res})`
      d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2.5)
    })
    .on('mouseout', function (_event, d) {
      info.value = ''
      d3.select(this).attr('stroke', '#222').attr('stroke-width', d._type === 'center' ? 2.5 : 1)
    })
    .on('click', (_event, d) => {
      if (d._type === 'center') return
      const id = BigInt(d.properties?.seqnum ?? d.id)
      navigateTo(id, d._res)
    })

  // Legend
  const legend = [
    { label: 'Selected', color: '#ff3333' },
    { label: 'Neighbor', color: '#3399ff' },
    { label: 'Parent', color: '#33cc33' },
    { label: 'Children', color: '#ffcc00' },
  ]
  const lg = svg.append('g').attr('transform', 'translate(10, 10)')
  lg.selectAll('rect')
    .data(legend)
    .enter()
    .append('rect')
    .attr('y', (_d, i) => i * 20)
    .attr('width', 14).attr('height', 14)
    .attr('fill', d => d.color)
    .attr('rx', 2)
  lg.selectAll('text')
    .data(legend)
    .enter()
    .append('text')
    .attr('x', 20)
    .attr('y', (_d, i) => 12 + i * 20)
    .text(d => d.label)
    .attr('font-size', 12)
    .attr('fill', '#333')

  // Resolution label
  svg.append('text')
    .attr('x', 630).attr('y', 16)
    .attr('text-anchor', 'end')
    .attr('font-size', 13).attr('fill', '#666')
    .text(`Resolution ${resolution}`)
}

function navigateTo(cellId, resolution) {
  state.history.push({ cell: state.selectedCell, res: state.selectedRes })
  if (state.history.length > 20) state.history.shift()
  selectCell(cellId, resolution)
}

function goToParent() {
  if (state.parentCell !== null && state.selectedRes > 0) {
    navigateTo(state.parentCell, state.selectedRes - 1)
  }
}

function goToChild(idx) {
  if (state.childrenCells.length > idx) {
    navigateTo(state.childrenCells[idx], state.selectedRes + 1)
  }
}

function goToNeighbor(idx) {
  if (state.neighborCells.length > idx) {
    navigateTo(state.neighborCells[idx], state.selectedRes)
  }
}

function goBack() {
  if (state.history.length > 0) {
    const prev = state.history.pop()
    selectCell(prev.cell, prev.res)
  }
}

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
</script>

<template>
  <div class="hierarchy-demo">
    <div v-if="state.loading" class="loading">Loading DGGS engine…</div>

    <template v-if="state.ready">
      <!-- SVG viewport -->
      <div class="viz-container">
        <svg ref="svgRef"></svg>
        <div v-if="info" class="hover-info">{{ info }}</div>
        <div v-else class="hover-info hint">Click any cell to select it</div>
      </div>

      <!-- Control panel -->
      <div class="panel" v-if="state.selectedCell !== null">
        <div class="panel-section">
          <div class="cell-id">
            Cell <strong>{{ state.selectedCell.toString() }}</strong>
            <span class="res-badge">res {{ state.selectedRes }}</span>
          </div>

          <button v-if="state.history.length" class="btn btn-back" @click="goBack">
            ← Back
          </button>
        </div>

        <!-- Parent -->
        <div class="panel-section">
          <div class="section-title parent-title">Parent</div>
          <div v-if="state.parentCell !== null" class="cell-list">
            <button class="btn btn-parent" @click="goToParent">
              {{ state.parentCell.toString() }}
              <span class="res-badge small">res {{ state.selectedRes - 1 }}</span>
            </button>
          </div>
          <div v-else class="muted">No parent (root resolution)</div>
        </div>

        <!-- Neighbors -->
        <div class="panel-section">
          <div class="section-title neighbor-title">Neighbors ({{ state.neighborCells.length }})</div>
          <div class="cell-list">
            <button
              v-for="(n, i) in state.neighborCells"
              :key="i"
              class="btn btn-neighbor"
              @click="goToNeighbor(i)"
            >{{ n.toString() }}</button>
          </div>
        </div>

        <!-- Children -->
        <div class="panel-section">
          <div class="section-title child-title">Children ({{ state.childrenCells.length }})</div>
          <div class="cell-list">
            <button
              v-for="(c, i) in state.childrenCells"
              :key="i"
              class="btn btn-child"
              @click="goToChild(i)"
            >{{ c.toString() }}</button>
          </div>
        </div>

        <!-- Address conversions -->
        <div class="panel-section" v-if="state.addressInfo">
          <div class="section-title">Address Conversions</div>
          <table class="addr-table">
            <tr>
              <td class="addr-label">VERTEX2DD</td>
              <td>
                v{{ state.addressInfo.vertex2dd.vertNum }},
                tri{{ state.addressInfo.vertex2dd.triNum }},
                ({{ state.addressInfo.vertex2dd.x.toFixed(4) }}, {{ state.addressInfo.vertex2dd.y.toFixed(4) }})
              </td>
            </tr>
            <tr>
              <td class="addr-label">ZORDER</td>
              <td>{{ state.addressInfo.zorder.toString() }}</td>
            </tr>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hierarchy-demo {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 1em;
}
.viz-container {
  position: relative;
  flex: 1 1 640px;
  min-width: 320px;
}
.viz-container svg {
  width: 100%;
  height: auto;
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 8px;
  background: var(--vp-c-bg-soft, #f6f6f7);
}
.hover-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg, #fff);
  padding: 4px 10px;
  border-radius: 6px;
  pointer-events: none;
  border: 1px solid var(--vp-c-divider, #e2e2e3);
}
.hover-info.hint {
  color: var(--vp-c-text-3, #999);
}
.loading {
  padding: 2em;
  color: var(--vp-c-text-2);
}

/* Panel */
.panel {
  flex: 0 0 260px;
  font-size: 13px;
  max-height: 480px;
  overflow-y: auto;
}
.panel-section {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-divider, #e2e2e3);
}
.panel-section:last-child {
  border-bottom: none;
}
.cell-id {
  font-size: 15px;
  margin-bottom: 6px;
}
.res-badge {
  display: inline-block;
  background: var(--vp-c-bg-soft, #f0f0f0);
  color: var(--vp-c-text-2);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 4px;
}
.res-badge.small {
  font-size: 10px;
  padding: 0 4px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.parent-title { color: #33cc33; }
.neighbor-title { color: #3399ff; }
.child-title { color: #cc9900; }

.cell-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Buttons */
.btn {
  border: 1px solid var(--vp-c-divider, #ddd);
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text-1);
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: var(--vp-font-family-mono, monospace);
  transition: background 0.15s;
}
.btn:hover {
  background: var(--vp-c-bg-soft, #f0f0f0);
}
.btn-back {
  font-family: inherit;
  font-size: 12px;
}
.btn-parent {
  border-left: 3px solid #33cc33;
}
.btn-neighbor {
  border-left: 3px solid #3399ff;
}
.btn-child {
  border-left: 3px solid #ffcc00;
}
.muted {
  color: var(--vp-c-text-3, #999);
  font-style: italic;
}

/* Address table */
.addr-table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}
.addr-table td {
  padding: 3px 0;
  vertical-align: top;
}
.addr-label {
  font-weight: 600;
  color: var(--vp-c-text-2);
  width: 80px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 11px;
}
.addr-table tr + tr td {
  border-top: 1px solid var(--vp-c-divider, #eee);
}
</style>
