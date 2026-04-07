<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

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
  // DGGS settings
  aperture: 4,
  topology: 'HEXAGON',
  projection: 'ISEA',
  resolution: 5,
  poleLat: 0,
  poleLng: 0,
  azimuth: 0,
  // Index type displayed on cells
  indexType: 'SEQNUM',
})

const availableIndexTypes = computed(() => {
  const types = ['SEQNUM', 'VERTEX2DD']
  if (state.aperture !== 7) types.push('ZORDER')
  if (state.aperture === 3 && state.topology === 'HEXAGON') types.push('Z3')
  if (state.aperture === 7 && state.topology === 'HEXAGON') types.push('Z7')
  return types
})

let dggs = null
let d3 = null

onMounted(async () => {
  await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js')
  const { Webdggrid } = await import('webdggrid')
  dggs = await Webdggrid.load()
  d3 = window.d3
  applySettings()
})

function applySettings() {
  if (!dggs) return
  dggs.setDggs({
    poleCoordinates: { lat: state.poleLat, lng: state.poleLng },
    azimuth: state.azimuth,
    aperture: state.aperture,
    topology: state.topology,
    projection: state.projection,
  }, state.resolution)

  // Reset index type if no longer available
  if (!availableIndexTypes.value.includes(state.indexType)) {
    state.indexType = 'SEQNUM'
  }

  state.ready = true
  state.loading = false
  state.history = []

  const totalCells = dggs.nCells(state.resolution)
  const maxId = Math.min(totalCells, 10000)
  const startCell = BigInt(Math.floor(Math.random() * maxId) + 1)
  selectCell(startCell, state.resolution)
}

function getCellLabel(seqnum, resolution) {
  try {
    switch (state.indexType) {
      case 'SEQNUM':
        return seqnum.toString()
      case 'VERTEX2DD': {
        const v = dggs.sequenceNumToVertex2DD(seqnum, resolution)
        return `v${v.vertNum} t${v.triNum} (${v.x.toFixed(2)},${v.y.toFixed(2)})`
      }
      case 'ZORDER':
        return dggs.sequenceNumToZOrder(seqnum, resolution).toString()
      case 'Z3':
        return dggs.sequenceNumToZ3(seqnum, resolution).toString()
      case 'Z7':
        return dggs.sequenceNumToZ7(seqnum, resolution).toString()
      default:
        return seqnum.toString()
    }
  } catch {
    return seqnum.toString()
  }
}

function selectCell(cellId, resolution) {
  if (!dggs || !d3) return

  state.selectedCell = cellId
  state.selectedRes = resolution

  try {
    state.neighborCells = dggs.sequenceNumNeighbors([cellId], resolution)[0]
  } catch {
    state.neighborCells = []
  }
  try {
    state.parentCell = resolution > 0 ? dggs.sequenceNumParent([cellId], resolution)[0] : null
  } catch {
    state.parentCell = null
  }
  try {
    state.childrenCells = dggs.sequenceNumChildren([cellId], resolution)[0]
  } catch {
    state.childrenCells = []
  }

  // Compute all address conversions for the panel
  try {
    const v2dd = dggs.sequenceNumToVertex2DD(cellId, resolution)
    let zorder = null
    let z3 = null
    let z7 = null
    try { if (state.aperture !== 7) zorder = dggs.sequenceNumToZOrder(cellId, resolution) } catch { /* unsupported */ }
    try { if (state.aperture === 3 && state.topology === 'HEXAGON') z3 = dggs.sequenceNumToZ3(cellId, resolution) } catch { /* unsupported */ }
    try { if (state.aperture === 7 && state.topology === 'HEXAGON') z7 = dggs.sequenceNumToZ7(cellId, resolution) } catch { /* unsupported */ }
    state.addressInfo = { vertex2dd: v2dd, zorder, z3, z7 }
  } catch {
    state.addressInfo = null
  }

  drawScene(cellId, resolution)
}

function drawScene(cellId, resolution) {
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', '0 0 640 440').attr('preserveAspectRatio', 'xMidYMid meet')

  const centerGeom = dggs.sequenceNumToGridFeatureCollection([cellId], resolution)
  const neighborGeom = dggs.sequenceNumToGridFeatureCollection(state.neighborCells, resolution)
  const childrenGeom = dggs.sequenceNumToGridFeatureCollection(state.childrenCells, resolution + 1)

  let parentGeom = null
  if (state.parentCell !== null && resolution > 0) {
    parentGeom = dggs.sequenceNumToGridFeatureCollection([state.parentCell], resolution - 1)
  }

  // Draw order: parent -> neighbors -> children -> center
  const features = []
  if (parentGeom) {
    features.push(...parentGeom.features.map(f => ({ ...f, _type: 'parent', _res: resolution - 1 })))
  }
  features.push(...neighborGeom.features.map(f => ({ ...f, _type: 'neighbor', _res: resolution })))
  features.push(...childrenGeom.features.map(f => ({ ...f, _type: 'child', _res: resolution + 1 })))
  features.push(...centerGeom.features.map(f => ({ ...f, _type: 'center', _res: resolution })))

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

  const proj = ([lng, lat]) => [320 + (lng - cx) * scale, 220 - (lat - cy) * scale]

  const colorMap = {
    parent: '#33cc33',
    neighbor: '#3399ff',
    center: '#ff3333',
    child: '#ffcc00',
  }

  const opacityMap = {
    parent: 0.25,
    neighbor: 0.85,
    center: 0.35,
    child: 0.6,
  }

  // Draw filled polygons
  svg.selectAll('polygon.cell')
    .data(features)
    .enter()
    .append('polygon')
    .attr('class', 'cell')
    .attr('points', d => d.geometry.coordinates[0].map(c => proj(c)).join(' '))
    .attr('fill', d => colorMap[d._type])
    .attr('stroke', '#333')
    .attr('stroke-width', 1)
    .attr('opacity', d => opacityMap[d._type])
    .attr('cursor', d => d._type !== 'center' ? 'pointer' : 'default')
    .on('mouseover', function (_event, d) {
      const label = d._type.charAt(0).toUpperCase() + d._type.slice(1)
      info.value = `${label} — ID: ${d.properties?.id ?? d.id ?? '?'} (res ${d._res})`
      d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2.5)
    })
    .on('mouseout', function (_event, d) {
      info.value = ''
      d3.select(this).attr('stroke', '#333').attr('stroke-width', 1)
    })
    .on('click', (_event, d) => {
      if (d._type === 'center') return
      const id = BigInt(d.properties?.id ?? d.id)
      navigateTo(id, d._res)
    })

  // Parent outline on top
  if (parentGeom) {
    svg.append('polygon')
      .attr('points', parentGeom.features[0].geometry.coordinates[0].map(c => proj(c)).join(' '))
      .attr('fill', 'none')
      .attr('stroke', '#33cc33')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6,3')
      .attr('pointer-events', 'none')
  }

  // Center outline on top
  svg.append('polygon')
    .attr('points', centerGeom.features[0].geometry.coordinates[0].map(c => proj(c)).join(' '))
    .attr('fill', 'none')
    .attr('stroke', '#ff3333')
    .attr('stroke-width', 3)
    .attr('pointer-events', 'none')

  // Draw index labels on cells (skip parent — too large)
  const labelFeatures = features.filter(f => f._type !== 'parent')
  const labelGroup = svg.append('g').attr('pointer-events', 'none')

  labelGroup.selectAll('text.cell-label')
    .data(labelFeatures)
    .enter()
    .append('text')
    .attr('class', 'cell-label')
    .attr('x', d => {
      const pts = d.geometry.coordinates[0].map(c => proj(c))
      return pts.reduce((s, p) => s + p[0], 0) / pts.length
    })
    .attr('y', d => {
      const pts = d.geometry.coordinates[0].map(c => proj(c))
      return pts.reduce((s, p) => s + p[1], 0) / pts.length
    })
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', d => d._type === 'child' ? 8 : 10)
    .attr('fill', '#222')
    .attr('font-family', 'var(--vp-font-family-mono, monospace)')
    .text(d => {
      const seqnum = BigInt(d.properties?.id ?? d.id)
      return getCellLabel(seqnum, d._res)
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
    .attr('fill', 'var(--vp-c-text-2, #555)')

  // Resolution label
  svg.append('text')
    .attr('x', 630).attr('y', 16)
    .attr('text-anchor', 'end')
    .attr('font-size', 13).attr('fill', 'var(--vp-c-text-3, #666)')
    .text(`Resolution ${resolution}`)
}

function onIndexTypeChange() {
  if (state.selectedCell !== null) {
    drawScene(state.selectedCell, state.selectedRes)
  }
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
    <div v-if="state.loading" class="loading">Loading DGGS engine...</div>

    <template v-if="state.ready">
      <!-- Settings bar -->
      <div class="settings-bar">
        <div class="setting">
          <label>Projection</label>
          <select v-model="state.projection" @change="applySettings">
            <option>ISEA</option>
            <option>FULLER</option>
          </select>
        </div>
        <div class="setting">
          <label>Aperture</label>
          <select v-model.number="state.aperture" @change="applySettings">
            <option :value="3">3</option>
            <option :value="4">4</option>
            <option :value="7">7</option>
          </select>
        </div>
        <div class="setting">
          <label>Topology</label>
          <select v-model="state.topology" @change="applySettings">
            <option>HEXAGON</option>
            <option>DIAMOND</option>
          </select>
        </div>
        <div class="setting">
          <label>Resolution</label>
          <input type="number" v-model.number="state.resolution" min="1" max="12" @change="applySettings" />
        </div>
        <div class="setting">
          <label>Pole Lat</label>
          <input type="number" v-model.number="state.poleLat" step="1" @change="applySettings" />
        </div>
        <div class="setting">
          <label>Pole Lng</label>
          <input type="number" v-model.number="state.poleLng" step="1" @change="applySettings" />
        </div>
        <div class="setting">
          <label>Azimuth</label>
          <input type="number" v-model.number="state.azimuth" step="1" @change="applySettings" />
        </div>
        <div class="setting-separator"></div>
        <div class="setting">
          <label>Cell Index</label>
          <select v-model="state.indexType" @change="onIndexTypeChange">
            <option v-for="t in availableIndexTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>

      <!-- SVG viewport -->
      <div class="viz-container">
        <svg ref="svgRef"></svg>
        <div v-if="info" class="hover-info">{{ info }}</div>
        <div v-else class="hover-info hint">Click any cell to select it</div>
      </div>

      <!-- Details panel — full width -->
      <div class="panel" v-if="state.selectedCell !== null">
        <!-- Top row: selected cell + hierarchy -->
        <div class="panel-row">
          <div class="panel-cell selected-info">
            <span class="cell-id">
              Cell <strong>{{ state.selectedCell.toString() }}</strong>
              <span class="res-badge">res {{ state.selectedRes }}</span>
            </span>
            <button v-if="state.history.length" class="btn btn-back" @click="goBack">Back</button>
          </div>

          <!-- Parent -->
          <div class="panel-cell">
            <div class="section-title parent-title">Parent</div>
            <div v-if="state.parentCell !== null" class="cell-list">
              <button class="btn btn-parent" @click="goToParent">
                {{ state.parentCell.toString() }}
                <span class="res-badge small">res {{ state.selectedRes - 1 }}</span>
              </button>
            </div>
            <div v-else class="muted">Root</div>
          </div>

          <!-- Neighbors -->
          <div class="panel-cell">
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
          <div class="panel-cell">
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
        </div>

        <!-- Address conversions — full width row -->
        <div class="addr-row" v-if="state.addressInfo">
          <div class="section-title">Address Conversions</div>
          <table class="addr-table">
            <tr>
              <td class="addr-label">SEQNUM</td>
              <td class="addr-value">{{ state.selectedCell.toString() }}</td>
              <td class="addr-label">VERTEX2DD</td>
              <td class="addr-value">
                vertex {{ state.addressInfo.vertex2dd.vertNum }},
                tri {{ state.addressInfo.vertex2dd.triNum }},
                x={{ state.addressInfo.vertex2dd.x.toFixed(6) }},
                y={{ state.addressInfo.vertex2dd.y.toFixed(6) }}
              </td>
              <td v-if="state.addressInfo.zorder !== null" class="addr-label">ZORDER</td>
              <td v-if="state.addressInfo.zorder !== null" class="addr-value">{{ state.addressInfo.zorder.toString() }}</td>
              <td v-if="state.addressInfo.z3 !== null" class="addr-label">Z3</td>
              <td v-if="state.addressInfo.z3 !== null" class="addr-value">{{ state.addressInfo.z3.toString() }}</td>
              <td v-if="state.addressInfo.z7 !== null" class="addr-label">Z7</td>
              <td v-if="state.addressInfo.z7 !== null" class="addr-value">{{ state.addressInfo.z7.toString() }}</td>
            </tr>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hierarchy-demo {
  margin-bottom: 1em;
}

/* Settings bar */
.settings-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 14px;
  background: var(--vp-c-bg-soft, #f6f6f7);
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 8px;
  margin-bottom: 10px;
  align-items: end;
}
.setting {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.setting label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3, #999);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.setting select,
.setting input {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider, #ddd);
  border-radius: 4px;
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text-1);
  font-size: 13px;
  min-width: 70px;
}
.setting input[type="number"] {
  width: 70px;
}
.setting-separator {
  width: 1px;
  background: var(--vp-c-divider, #e2e2e3);
  align-self: stretch;
  margin: 0 4px;
}

/* SVG */
.viz-container {
  position: relative;
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

/* Panel — full width */
.panel {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--vp-c-bg-soft, #f6f6f7);
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 8px;
  font-size: 13px;
}
.panel-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.panel-cell {
  flex: 1 1 0;
  min-width: 140px;
}
.panel-cell.selected-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}
.cell-id {
  font-size: 14px;
  white-space: nowrap;
}
.res-badge {
  display: inline-block;
  background: var(--vp-c-default-soft, #e8e8e8);
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
  margin-bottom: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.parent-title { color: #2ba52b; }
.neighbor-title { color: #2b7fd4; }
.child-title { color: #c29200; }

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
  background: var(--vp-c-default-soft, #e8e8e8);
}
.btn-back {
  font-family: inherit;
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.btn-parent { border-left: 3px solid #33cc33; }
.btn-neighbor { border-left: 3px solid #3399ff; }
.btn-child { border-left: 3px solid #ffcc00; }
.muted {
  color: var(--vp-c-text-3, #999);
  font-style: italic;
  font-size: 12px;
}

/* Address row — full width beneath hierarchy */
.addr-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--vp-c-divider, #e2e2e3);
}
.addr-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
  font-family: var(--vp-font-family-mono, monospace);
}
.addr-table td {
  padding: 4px 12px 4px 0;
  vertical-align: top;
}
.addr-label {
  font-weight: 600;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.addr-value {
  color: var(--vp-c-text-1);
  padding-right: 24px;
}
</style>
