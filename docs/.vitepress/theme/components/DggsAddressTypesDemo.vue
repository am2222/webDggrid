<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const svgRef = ref(null)
const info = ref('')
const state = reactive({
  ready: false,
  loading: true,
  // DGGS settings
  aperture: 4,
  topology: 'HEXAGON',
  projection: 'ISEA',
  resolution: 5,
  // Selected cell
  selectedCell: null,
  selectedRes: null,
  // Address conversions for selected cell
  addresses: null,
  // Batch conversion for all visible cells
  cellAddresses: new Map(),
  // Display mode
  displayType: 'SEQNUM',
  // Visible cells (center + ring of neighbors)
  visibleCells: [],
  // Round-trip check
  roundTrip: null,
})

const availableTypes = computed(() => {
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
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    aperture: state.aperture,
    topology: state.topology,
    projection: state.projection,
  }, state.resolution)

  if (!availableTypes.value.includes(state.displayType)) {
    state.displayType = 'SEQNUM'
  }

  state.ready = true
  state.loading = false

  const totalCells = dggs.nCells(state.resolution)
  const maxId = Math.min(totalCells, 10000)
  const startCell = BigInt(Math.floor(Math.random() * maxId) + 1)
  pickCell(startCell, state.resolution)
}

function convertCell(seqnum, resolution) {
  const result = { seqnum }
  try { result.vertex2dd = dggs.sequenceNumToVertex2DD(seqnum, resolution) } catch { result.vertex2dd = null }
  try { result.zorder = (state.aperture !== 7) ? dggs.sequenceNumToZOrder(seqnum, resolution) : null } catch { result.zorder = null }
  try { result.z3 = (state.aperture === 3 && state.topology === 'HEXAGON') ? dggs.sequenceNumToZ3(seqnum, resolution) : null } catch { result.z3 = null }
  try { result.z7 = (state.aperture === 7 && state.topology === 'HEXAGON') ? dggs.sequenceNumToZ7(seqnum, resolution) : null } catch { result.z7 = null }
  return result
}

function verifyRoundTrip(addr, resolution) {
  const checks = []
  if (addr.vertex2dd) {
    try {
      const v = addr.vertex2dd
      const back = dggs.vertex2DDToSequenceNum(v.keep, v.vertNum, v.triNum, v.x, v.y, resolution)
      checks.push({ type: 'VERTEX2DD', original: addr.seqnum, converted: back, match: back === addr.seqnum })
    } catch { checks.push({ type: 'VERTEX2DD', original: addr.seqnum, converted: null, match: false }) }
  }
  if (addr.zorder !== null) {
    try {
      const back = dggs.zOrderToSequenceNum(addr.zorder, resolution)
      checks.push({ type: 'ZORDER', original: addr.seqnum, converted: back, match: back === addr.seqnum })
    } catch { checks.push({ type: 'ZORDER', original: addr.seqnum, converted: null, match: false }) }
  }
  if (addr.z3 !== null) {
    try {
      const back = dggs.z3ToSequenceNum(addr.z3, resolution)
      checks.push({ type: 'Z3', original: addr.seqnum, converted: back, match: back === addr.seqnum })
    } catch { checks.push({ type: 'Z3', original: addr.seqnum, converted: null, match: false }) }
  }
  if (addr.z7 !== null) {
    try {
      const back = dggs.z7ToSequenceNum(addr.z7, resolution)
      checks.push({ type: 'Z7', original: addr.seqnum, converted: back, match: back === addr.seqnum })
    } catch { checks.push({ type: 'Z7', original: addr.seqnum, converted: null, match: false }) }
  }
  return checks
}

function formatAddress(addr, type) {
  if (!addr) return '?'
  switch (type) {
    case 'SEQNUM': return addr.seqnum.toString()
    case 'VERTEX2DD':
      if (!addr.vertex2dd) return 'N/A'
      return `v${addr.vertex2dd.vertNum} t${addr.vertex2dd.triNum} (${addr.vertex2dd.x.toFixed(2)}, ${addr.vertex2dd.y.toFixed(2)})`
    case 'ZORDER': return addr.zorder !== null ? addr.zorder.toString() : 'N/A'
    case 'Z3': return addr.z3 !== null ? addr.z3.toString() : 'N/A'
    case 'Z7': return addr.z7 !== null ? addr.z7.toString() : 'N/A'
    default: return addr.seqnum.toString()
  }
}

function pickCell(cellId, resolution) {
  if (!dggs || !d3) return

  state.selectedCell = cellId
  state.selectedRes = resolution

  // Get neighbors to form the visible cluster
  let neighbors = []
  try { neighbors = dggs.sequenceNumNeighbors([cellId], resolution)[0] } catch { /* skip */ }

  state.visibleCells = [cellId, ...neighbors]

  // Convert all visible cells
  const addrMap = new Map()
  for (const c of state.visibleCells) {
    addrMap.set(c.toString(), convertCell(c, resolution))
  }
  state.cellAddresses = addrMap

  // Full conversion for selected cell
  state.addresses = convertCell(cellId, resolution)
  state.roundTrip = verifyRoundTrip(state.addresses, resolution)

  drawScene(resolution)
}

function drawScene(resolution) {
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', '0 0 640 400').attr('preserveAspectRatio', 'xMidYMid meet')

  const geom = dggs.sequenceNumToGridFeatureCollection(state.visibleCells, resolution)

  const features = geom.features.map((f, i) => ({
    ...f,
    _isCenter: i === 0,
    _seqnum: state.visibleCells[i],
  }))

  // Bounding box
  const allCoords = features.flatMap(f => f.geometry.coordinates[0])
  const lngs = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)

  const pad = 30
  const scaleX = (640 - pad * 2) / (maxLng - minLng || 1)
  const scaleY = (400 - pad * 2) / (maxLat - minLat || 1)
  const scale = Math.min(scaleX, scaleY)
  const cx = (minLng + maxLng) / 2
  const cy = (minLat + maxLat) / 2
  const proj = ([lng, lat]) => [320 + (lng - cx) * scale, 200 - (lat - cy) * scale]

  // Polygons
  svg.selectAll('polygon.cell')
    .data(features)
    .enter()
    .append('polygon')
    .attr('class', 'cell')
    .attr('points', d => d.geometry.coordinates[0].map(c => proj(c)).join(' '))
    .attr('fill', d => d._isCenter ? '#e8f4fd' : '#f0f0f0')
    .attr('stroke', d => d._isCenter ? '#2b7fd4' : '#999')
    .attr('stroke-width', d => d._isCenter ? 2.5 : 1)
    .attr('cursor', 'pointer')
    .on('mouseover', function (_event, d) {
      const addr = state.cellAddresses.get(d._seqnum.toString())
      info.value = addr ? `SEQNUM: ${addr.seqnum} → ${state.displayType}: ${formatAddress(addr, state.displayType)}` : ''
      d3.select(this).attr('stroke', '#2b7fd4').attr('stroke-width', 2.5)
    })
    .on('mouseout', function (_event, d) {
      info.value = ''
      d3.select(this)
        .attr('stroke', d._isCenter ? '#2b7fd4' : '#999')
        .attr('stroke-width', d._isCenter ? 2.5 : 1)
    })
    .on('click', (_event, d) => {
      pickCell(d._seqnum, resolution)
    })

  // Labels
  const labelGroup = svg.append('g').attr('pointer-events', 'none')
  labelGroup.selectAll('text.cell-label')
    .data(features)
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
    .attr('font-size', state.displayType === 'VERTEX2DD' ? 8 : 10)
    .attr('fill', '#333')
    .attr('font-family', 'var(--vp-font-family-mono, monospace)')
    .text(d => {
      const addr = state.cellAddresses.get(d._seqnum.toString())
      return formatAddress(addr, state.displayType)
    })

  // Type badge
  svg.append('text')
    .attr('x', 630).attr('y', 16)
    .attr('text-anchor', 'end')
    .attr('font-size', 13).attr('fill', 'var(--vp-c-text-3, #666)')
    .text(`${state.displayType} · res ${resolution}`)
}

function onDisplayChange() {
  if (state.selectedCell !== null) {
    drawScene(state.selectedRes)
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
  <div class="addr-demo">
    <div v-if="state.loading" class="loading">Loading DGGS engine...</div>

    <template v-if="state.ready">
      <!-- Settings -->
      <div class="settings-bar">
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
        <div class="setting-separator"></div>
        <div class="setting">
          <label>Display As</label>
          <select v-model="state.displayType" @change="onDisplayChange">
            <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>

      <!-- Map -->
      <div class="viz-container">
        <svg ref="svgRef"></svg>
        <div v-if="info" class="hover-info">{{ info }}</div>
        <div v-else class="hover-info hint">Click a cell to inspect its address conversions</div>
      </div>

      <!-- Conversion table for selected cell -->
      <div class="panel" v-if="state.addresses">
        <div class="panel-header">
          Cell <strong>{{ state.selectedCell.toString() }}</strong>
          <span class="res-badge">res {{ state.selectedRes }}</span>
          — All Address Representations
        </div>

        <table class="conv-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>Round-trip</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="type-label">SEQNUM</td>
              <td class="type-value">{{ state.addresses.seqnum.toString() }}</td>
              <td class="rt-status">—</td>
            </tr>
            <tr v-if="state.addresses.vertex2dd">
              <td class="type-label">VERTEX2DD</td>
              <td class="type-value">
                keep={{ state.addresses.vertex2dd.keep }},
                vertex={{ state.addresses.vertex2dd.vertNum }},
                tri={{ state.addresses.vertex2dd.triNum }},
                x={{ state.addresses.vertex2dd.x.toFixed(6) }},
                y={{ state.addresses.vertex2dd.y.toFixed(6) }}
              </td>
              <td class="rt-status">
                <span v-if="state.roundTrip?.find(r => r.type === 'VERTEX2DD')?.match" class="rt-ok">OK</span>
                <span v-else class="rt-fail">FAIL</span>
              </td>
            </tr>
            <tr v-if="state.addresses.zorder !== null">
              <td class="type-label">ZORDER</td>
              <td class="type-value">{{ state.addresses.zorder.toString() }}</td>
              <td class="rt-status">
                <span v-if="state.roundTrip?.find(r => r.type === 'ZORDER')?.match" class="rt-ok">OK</span>
                <span v-else class="rt-fail">FAIL</span>
              </td>
            </tr>
            <tr v-if="state.addresses.z3 !== null">
              <td class="type-label">Z3</td>
              <td class="type-value">{{ state.addresses.z3.toString() }}</td>
              <td class="rt-status">
                <span v-if="state.roundTrip?.find(r => r.type === 'Z3')?.match" class="rt-ok">OK</span>
                <span v-else class="rt-fail">FAIL</span>
              </td>
            </tr>
            <tr v-if="state.addresses.z7 !== null">
              <td class="type-label">Z7</td>
              <td class="type-value">{{ state.addresses.z7.toString() }}</td>
              <td class="rt-status">
                <span v-if="state.roundTrip?.find(r => r.type === 'Z7')?.match" class="rt-ok">OK</span>
                <span v-else class="rt-fail">FAIL</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.addr-demo {
  margin-bottom: 1em;
}

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

/* Panel */
.panel {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--vp-c-bg-soft, #f6f6f7);
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 8px;
}
.panel-header {
  font-size: 14px;
  margin-bottom: 10px;
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

/* Conversion table */
.conv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.conv-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3, #999);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 8px 6px 0;
  border-bottom: 1px solid var(--vp-c-divider, #e2e2e3);
}
.conv-table td {
  padding: 6px 8px 6px 0;
  border-bottom: 1px solid var(--vp-c-divider, #eee);
}
.type-label {
  font-weight: 600;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  width: 90px;
}
.type-value {
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-1);
  word-break: break-all;
}
.rt-status {
  width: 60px;
  text-align: center;
}
.rt-ok {
  color: #2ba52b;
  font-weight: 600;
  font-size: 12px;
}
.rt-fail {
  color: #d43b2b;
  font-weight: 600;
  font-size: 12px;
}
</style>
