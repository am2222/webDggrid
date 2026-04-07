<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'

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
  // Bitarithmetic results
  bitOps: null,
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

async function applySettings() {
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

  await nextTick()

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

// --- Bitarithmetic demonstration ---

function computeBitOps(addr, resolution) {
  const ops = { sections: [] }

  // Z3 arithmetic (aperture 3)
  if (addr.z3 !== null) {
    const z3 = addr.z3
    const base = 3n
    // Extract digits: each resolution level is one base-3 digit
    // The Z3 value encodes digits from MSB (coarsest) to LSB (finest)
    const digits = extractDigits(z3, base, resolution)

    // Parent via bit manipulation: drop the last digit
    const parentZ3Bits = z3 / base
    let parentSeqBits = null
    try { parentSeqBits = dggs.z3ToSequenceNum(parentZ3Bits, resolution - 1) } catch { /* skip */ }

    // Actual parent via API
    let parentSeqApi = null
    try { parentSeqApi = dggs.sequenceNumParent([addr.seqnum], resolution)[0] } catch { /* skip */ }

    // Children via bit manipulation: append digits 0,1,2
    const childrenBits = []
    for (let d = 0n; d < base; d++) {
      const childZ3 = z3 * base + d
      try {
        const childSeq = dggs.z3ToSequenceNum(childZ3, resolution + 1)
        childrenBits.push({ digit: Number(d), z3: childZ3, seqnum: childSeq })
      } catch { childrenBits.push({ digit: Number(d), z3: childZ3, seqnum: null }) }
    }

    // Actual children via API
    let childrenApi = []
    try { childrenApi = dggs.sequenceNumChildren([addr.seqnum], resolution)[0] } catch { /* skip */ }

    ops.sections.push({
      type: 'Z3',
      base: 3,
      value: z3,
      hex: '0x' + z3.toString(16),
      digits,
      parent: {
        formula: `z3 / ${base} = ${parentZ3Bits}`,
        bitResult: parentSeqBits,
        apiResult: parentSeqApi,
        match: parentSeqBits !== null && parentSeqApi !== null && parentSeqBits === parentSeqApi,
      },
      children: childrenBits,
      childrenApi,
    })
  }

  // Z7 arithmetic (aperture 7)
  if (addr.z7 !== null) {
    const z7 = addr.z7
    const base = 7n
    const digits = extractDigits(z7, base, resolution)

    const parentZ7Bits = z7 / base
    let parentSeqBits = null
    try { parentSeqBits = dggs.z7ToSequenceNum(parentZ7Bits, resolution - 1) } catch { /* skip */ }

    let parentSeqApi = null
    try { parentSeqApi = dggs.sequenceNumParent([addr.seqnum], resolution)[0] } catch { /* skip */ }

    const childrenBits = []
    for (let d = 0n; d < base; d++) {
      const childZ7 = z7 * base + d
      try {
        const childSeq = dggs.z7ToSequenceNum(childZ7, resolution + 1)
        childrenBits.push({ digit: Number(d), z7: childZ7, seqnum: childSeq })
      } catch { childrenBits.push({ digit: Number(d), z7: childZ7, seqnum: null }) }
    }

    let childrenApi = []
    try { childrenApi = dggs.sequenceNumChildren([addr.seqnum], resolution)[0] } catch { /* skip */ }

    ops.sections.push({
      type: 'Z7',
      base: 7,
      value: z7,
      hex: '0x' + z7.toString(16),
      digits,
      parent: {
        formula: `z7 / ${base} = ${parentZ7Bits}`,
        bitResult: parentSeqBits,
        apiResult: parentSeqApi,
        match: parentSeqBits !== null && parentSeqApi !== null && parentSeqBits === parentSeqApi,
      },
      children: childrenBits,
      childrenApi,
    })
  }

  // ZORDER spatial locality
  if (addr.zorder !== null) {
    const zorder = addr.zorder
    // Show neighbor ZORDER values to demonstrate spatial locality
    let neighbors = []
    try {
      const nIds = dggs.sequenceNumNeighbors([addr.seqnum], resolution)[0]
      neighbors = nIds.map(n => {
        try {
          const nz = dggs.sequenceNumToZOrder(n, resolution)
          const diff = nz > zorder ? nz - zorder : zorder - nz
          return { seqnum: n, zorder: nz, diff, hex: '0x' + nz.toString(16) }
        } catch {
          return { seqnum: n, zorder: null, diff: null, hex: 'N/A' }
        }
      })
      neighbors.sort((a, b) => {
        if (a.diff === null) return 1
        if (b.diff === null) return -1
        return a.diff < b.diff ? -1 : a.diff > b.diff ? 1 : 0
      })
    } catch { /* skip */ }

    // Common prefix with neighbors (shared ancestor)
    const centerHex = zorder.toString(16).padStart(16, '0')
    const prefixes = neighbors.filter(n => n.zorder !== null).map(n => {
      const nHex = n.zorder.toString(16).padStart(16, '0')
      let common = 0
      for (let i = 0; i < centerHex.length; i++) {
        if (centerHex[i] === nHex[i]) common++
        else break
      }
      return { ...n, commonPrefix: common, totalDigits: centerHex.length }
    })

    ops.sections.push({
      type: 'ZORDER',
      value: zorder,
      hex: '0x' + zorder.toString(16).padStart(16, '0'),
      neighbors: prefixes,
    })
  }

  return ops.sections.length > 0 ? ops : null
}

function extractDigits(value, base, numDigits) {
  const digits = []
  let v = value
  for (let i = 0; i < numDigits; i++) {
    digits.unshift(Number(v % base))
    v = v / base
  }
  return digits
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

  let neighbors = []
  try { neighbors = dggs.sequenceNumNeighbors([cellId], resolution)[0] } catch { /* skip */ }

  state.visibleCells = [cellId, ...neighbors]

  const addrMap = new Map()
  for (const c of state.visibleCells) {
    addrMap.set(c.toString(), convertCell(c, resolution))
  }
  state.cellAddresses = addrMap

  state.addresses = convertCell(cellId, resolution)
  state.roundTrip = verifyRoundTrip(state.addresses, resolution)
  state.bitOps = computeBitOps(state.addresses, resolution)

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

      <!-- Conversion table -->
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

      <!-- Bitarithmetic demonstration -->
      <div v-if="state.bitOps" class="panel bitops-panel">
        <div class="panel-header">Index Arithmetic — Live Demonstration</div>

        <div v-for="section in state.bitOps.sections" :key="section.type" class="bitops-section">

          <!-- Z3 / Z7 hierarchical arithmetic -->
          <template v-if="section.type === 'Z3' || section.type === 'Z7'">
            <div class="bitops-title">{{ section.type }} — Base-{{ section.base }} Hierarchical Arithmetic</div>

            <!-- Digit breakdown -->
            <div class="digit-row">
              <span class="digit-label">{{ section.type }} value:</span>
              <span class="digit-value">{{ section.hex }}</span>
            </div>
            <div class="digit-row">
              <span class="digit-label">Digits (res 1→{{ state.selectedRes }}):</span>
              <span class="digit-cells">
                <span
                  v-for="(d, i) in section.digits"
                  :key="i"
                  class="digit-cell"
                  :class="{ 'digit-last': i === section.digits.length - 1 }"
                >{{ d }}</span>
              </span>
              <span class="digit-hint">each digit = which child at that level</span>
            </div>

            <!-- Parent via division -->
            <div class="op-block">
              <div class="op-title">Find Parent (drop last digit)</div>
              <div class="op-code">
                <code>{{ section.type.toLowerCase() }} / {{ section.base }}</code>
                = <code>{{ section.parent.formula.split('=')[1]?.trim() }}</code>
              </div>
              <div class="op-row">
                <span class="op-label">Bit arithmetic result:</span>
                <span class="op-val">SEQNUM {{ section.parent.bitResult?.toString() ?? 'error' }}</span>
              </div>
              <div class="op-row">
                <span class="op-label">API sequenceNumParent():</span>
                <span class="op-val">SEQNUM {{ section.parent.apiResult?.toString() ?? 'error' }}</span>
              </div>
              <div class="op-row">
                <span class="op-label">Match:</span>
                <span :class="section.parent.match ? 'rt-ok' : 'rt-fail'">
                  {{ section.parent.match ? 'Yes — identical!' : 'No' }}
                </span>
              </div>
            </div>

            <!-- Children via multiplication -->
            <div class="op-block">
              <div class="op-title">Find Children (append digit 0–{{ section.base - 1 }})</div>
              <table class="children-table">
                <thead>
                  <tr>
                    <th>Digit</th>
                    <th>Formula</th>
                    <th>{{ section.type }}</th>
                    <th>SEQNUM (bit)</th>
                    <th>SEQNUM (API)</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="child in section.children" :key="child.digit">
                    <td class="digit-cell-inline">{{ child.digit }}</td>
                    <td><code>{{ section.type.toLowerCase() }} * {{ section.base }} + {{ child.digit }}</code></td>
                    <td class="mono">{{ child[section.type.toLowerCase()]?.toString() ?? '?' }}</td>
                    <td class="mono">{{ child.seqnum?.toString() ?? 'err' }}</td>
                    <td class="mono">{{ section.childrenApi[child.digit]?.toString() ?? 'err' }}</td>
                    <td>
                      <span v-if="child.seqnum !== null && section.childrenApi[child.digit] !== undefined && child.seqnum === section.childrenApi[child.digit]" class="rt-ok">OK</span>
                      <span v-else class="rt-fail">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- ZORDER spatial locality -->
          <template v-if="section.type === 'ZORDER'">
            <div class="bitops-title">ZORDER — Spatial Locality via Bit Proximity</div>

            <div class="digit-row">
              <span class="digit-label">Selected cell:</span>
              <span class="digit-value">{{ section.hex }}</span>
            </div>

            <div class="op-block">
              <div class="op-title">Neighbor ZORDER values (sorted by distance)</div>
              <p class="op-hint">Cells that are spatially close have numerically close ZORDER values. Shared hex prefix = shared ancestor in the hierarchy.</p>
              <table class="children-table">
                <thead>
                  <tr>
                    <th>SEQNUM</th>
                    <th>ZORDER (hex)</th>
                    <th>Distance</th>
                    <th>Shared Prefix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="zorder-center">
                    <td class="mono">{{ state.selectedCell.toString() }} (selected)</td>
                    <td class="mono">{{ section.hex }}</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                  <tr v-for="(n, i) in section.neighbors" :key="i">
                    <td class="mono">{{ n.seqnum.toString() }}</td>
                    <td class="mono">{{ n.hex }}</td>
                    <td class="mono">{{ n.diff?.toString() ?? 'N/A' }}</td>
                    <td>
                      <span class="prefix-bar">
                        <span class="prefix-shared" :style="{ width: (n.commonPrefix / n.totalDigits * 100) + '%' }"></span>
                      </span>
                      <span class="prefix-text">{{ n.commonPrefix }}/{{ n.totalDigits }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>

      <!-- Explainer when no bitops available -->
      <div v-else-if="state.addresses && state.topology === 'HEXAGON'" class="panel note-panel">
        <strong>Note:</strong> Aperture {{ state.aperture }} with HEXAGON topology supports
        <template v-if="state.aperture === 4">ZORDER</template>
        <template v-if="state.aperture === 3">ZORDER and Z3</template>
        <template v-if="state.aperture === 7">Z7</template>
        arithmetic. Select one of these display types above to see the demonstration.
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

/* Panels */
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
  font-weight: 600;
}
.res-badge {
  display: inline-block;
  background: var(--vp-c-default-soft, #e8e8e8);
  color: var(--vp-c-text-2);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 4px;
  font-weight: normal;
}
.note-panel {
  font-size: 13px;
  color: var(--vp-c-text-2);
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
  padding: 6px 8px 6px 10px;
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

/* Bitarithmetic panel */
.bitops-panel {
  margin-top: 10px;
}
.bitops-section + .bitops-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider, #e2e2e3);
}
.bitops-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 10px;
}

/* Digit breakdown */
.digit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  flex-wrap: wrap;
}
.digit-label {
  color: var(--vp-c-text-2);
  font-weight: 600;
  font-size: 12px;
  min-width: 140px;
}
.digit-value {
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-1);
}
.digit-cells {
  display: flex;
  gap: 2px;
}
.digit-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--vp-c-divider, #ddd);
  border-radius: 3px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  font-weight: 600;
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text-1);
}
.digit-last {
  background: #e8f4fd;
  border-color: #2b7fd4;
  color: #2b7fd4;
}
.digit-hint {
  font-size: 11px;
  color: var(--vp-c-text-3, #999);
  font-style: italic;
}

/* Operation blocks */
.op-block {
  margin: 12px 0;
  padding: 10px 12px;
  background: var(--vp-c-bg, #fff);
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 6px;
}
.op-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.op-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
}
.op-code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}
.op-code code {
  background: var(--vp-c-default-soft, #e8e8e8);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
.op-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 4px;
  align-items: center;
}
.op-label {
  color: var(--vp-c-text-2);
  min-width: 180px;
}
.op-val {
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-1);
}

/* Children / ZORDER tables */
.children-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 4px;
}
/* Only one .children-table td rule, with correct padding */
.children-table td {
  padding: 6px 8px 6px 10px;
  border-bottom: 1px solid var(--vp-c-divider, #eee);
  vertical-align: middle;
}
.children-table .mono {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 11px;
}
.digit-cell-inline {
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 600;
  color: #2b7fd4;
  width: 30px;
}
.zorder-center {
  background: #e8f4fd;
  color: #222;
}
@media (prefers-color-scheme: dark) {
  .zorder-center {
    background: #23405a;
    color: #fff;
  }
}
.zorder-center td {
  font-weight: 600;
  padding-left: 10px;
}

/* Prefix bar */
.prefix-bar {
  display: inline-block;
  width: 60px;
  height: 8px;
  background: var(--vp-c-divider, #e2e2e3);
  border-radius: 4px;
  overflow: hidden;
  vertical-align: middle;
  margin-right: 6px;
}
.prefix-shared {
  display: block;
  height: 100%;
  background: #2ba52b;
  border-radius: 4px;
}
.prefix-text {
  font-size: 10px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono, monospace);
}
</style>
