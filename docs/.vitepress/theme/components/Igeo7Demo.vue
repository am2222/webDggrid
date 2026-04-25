<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { loadWebdggrid } from '../utils/loadWebdggrid.js'

const INVALID = 0xFFFFFFFFFFFFFFFFn

const state = reactive({
  ready: false,
  loading: true,
  error: null,
  input: '0800432',
  packed: null,
})

let dggs = null

onMounted(async () => {
  try {
    const Webdggrid = await loadWebdggrid()
    dggs = await Webdggrid.load()
    state.ready = true
    state.loading = false
    parseInput()
  } catch (e) {
    state.error = e?.message ?? String(e)
    state.loading = false
  }
})

function parseInput() {
  if (!dggs) return
  state.error = null
  try {
    const s = state.input.trim()
    if (!/^\d+$/.test(s) || s.length < 2) {
      throw new Error('Enter a numeric Z7 string (2-digit base + digit chars), e.g. "0800432"')
    }
    const base = Number(s.slice(0, 2))
    if (base < 0 || base > 11) {
      throw new Error(`Base cell ${base} is out of range (must be 0-11)`)
    }
    if (s.length > 22) {
      throw new Error('Z7 strings have at most 20 digits beyond the base')
    }
    state.packed = dggs.igeo7FromString(s)
  } catch (e) {
    state.packed = null
    state.error = e?.message ?? String(e)
  }
}

function selectExample(s) {
  state.input = s
  parseInput()
}

function loadFromPacked(idx) {
  state.input = dggs.igeo7ToString(idx)
  parseInput()
}

const baseCell = computed(() =>
  state.packed != null ? dggs.igeo7GetBaseCell(state.packed) : null
)
const resolution = computed(() =>
  state.packed != null ? dggs.igeo7GetResolution(state.packed) : null
)
const digits = computed(() => {
  if (state.packed == null) return []
  return Array.from({ length: 20 }, (_, i) => dggs.igeo7GetDigit(state.packed, i + 1))
})
const firstNonZero = computed(() =>
  state.packed != null ? dggs.igeo7FirstNonZero(state.packed) : null
)

const parentChain = computed(() => {
  if (state.packed == null) return []
  const out = []
  let cell = state.packed
  while (true) {
    out.push({
      cell,
      string: dggs.igeo7ToString(cell),
      resolution: dggs.igeo7GetResolution(cell),
    })
    if (dggs.igeo7GetResolution(cell) === 0) break
    cell = dggs.igeo7Parent(cell)
  }
  return out
})

const neighbours = computed(() => {
  if (state.packed == null) return []
  return dggs.igeo7Neighbours(state.packed).map((n, i) => ({
    direction: i + 1,
    cell: n,
    valid: dggs.igeo7IsValid(n),
    string: dggs.igeo7IsValid(n) ? dggs.igeo7ToString(n) : '—',
  }))
})

const packedHex = computed(() => {
  if (state.packed == null) return ''
  return '0x' + state.packed.toString(16).toUpperCase().padStart(16, '0')
})
</script>

<template>
  <div class="igeo7-demo">
    <div v-if="state.loading" class="status">Loading WebDggrid WASM…</div>
    <div v-else-if="state.error && !state.ready" class="status error">
      Failed to load: {{ state.error }}
    </div>
    <template v-else>
      <div class="control-row">
        <label>
          <span class="label">Z7 string</span>
          <input
            v-model="state.input"
            class="input"
            spellcheck="false"
            @input="parseInput"
            @keydown.enter="parseInput"
          />
        </label>
        <div class="examples">
          <span class="label">Examples:</span>
          <button
            v-for="ex in ['0800432', '08', '0800', '11', '000161612062413', '07654321']"
            :key="ex"
            class="chip"
            @click="selectExample(ex)"
          >
            {{ ex }}
          </button>
        </div>
      </div>

      <div v-if="state.error" class="status error">{{ state.error }}</div>

      <div v-if="state.packed != null" class="grid">
        <section class="card">
          <h4>Decomposition</h4>
          <table class="kv">
            <tbody>
              <tr><th>Compact</th><td><code>{{ dggs.igeo7ToString(state.packed) }}</code></td></tr>
              <tr><th>Packed (decimal)</th><td><code>{{ state.packed.toString() }}n</code></td></tr>
              <tr><th>Packed (hex)</th><td><code>{{ packedHex }}</code></td></tr>
              <tr><th>Base cell</th><td>{{ baseCell }}</td></tr>
              <tr><th>Resolution</th><td>{{ resolution }}</td></tr>
              <tr><th>First non-zero digit</th><td>{{ firstNonZero }}</td></tr>
            </tbody>
          </table>

          <h5>Digit slots (1-20)</h5>
          <div class="digits">
            <span
              v-for="(d, i) in digits"
              :key="i"
              class="digit"
              :class="{ padding: d === 7, leading: i + 1 < firstNonZero, active: i + 1 === firstNonZero }"
              :title="`Position ${i + 1}` + (d === 7 ? ' (padding)' : '')"
            >
              <small>{{ i + 1 }}</small>
              <strong>{{ d }}</strong>
            </span>
          </div>
        </section>

        <section class="card">
          <h4>Parent chain (walk up to resolution 0)</h4>
          <table class="rows">
            <thead>
              <tr><th>Step</th><th>Compact</th><th>Resolution</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in parentChain" :key="i" :class="{ self: i === 0 }">
                <td>{{ i }}</td>
                <td><code>{{ row.string }}</code></td>
                <td>{{ row.resolution }}</td>
                <td>
                  <button v-if="i > 0" class="link-btn" @click="loadFromPacked(row.cell)">→ inspect</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="card">
          <h4>Neighbours (6 GBT directions)</h4>
          <table class="rows">
            <thead>
              <tr><th>Dir</th><th>Compact</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="n in neighbours" :key="n.direction" :class="{ invalid: !n.valid }">
                <td>{{ n.direction }}</td>
                <td><code>{{ n.string }}</code></td>
                <td>
                  <span v-if="n.valid" class="badge ok">valid</span>
                  <span v-else class="badge warn">excluded</span>
                </td>
                <td>
                  <button v-if="n.valid" class="link-btn" @click="loadFromPacked(n.cell)">→ inspect</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="hint">
            Excluded neighbours are <code>UINT64_MAX</code> — typically one direction
            on the 12 pentagon base cells at low resolutions.
          </p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.igeo7-demo {
  margin: 1.25rem 0;
  font-size: 0.92rem;
}

.status {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}
.status.error {
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-warning-1);
  border: 1px solid var(--vp-c-warning-2);
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.input {
  font-family: var(--vp-font-family-mono);
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  width: 100%;
  box-sizing: border-box;
}
.input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.chip {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 900px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
  .card:first-child {
    grid-column: 1 / -1;
  }
}

.card {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 1rem;
  background: var(--vp-c-bg);
}
.card h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
}
.card h5 {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

table {
  width: 100%;
  border-collapse: collapse;
}
.kv th,
.kv td {
  padding: 0.3rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: top;
}
.kv th {
  font-weight: 600;
  color: var(--vp-c-text-2);
  width: 40%;
}
.kv tr:last-child th,
.kv tr:last-child td {
  border-bottom: none;
}

.rows th,
.rows td {
  padding: 0.35rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}
.rows thead th {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  border-bottom: 2px solid var(--vp-c-divider);
}
.rows tr.self code { font-weight: 700; }
.rows tr.invalid { opacity: 0.55; }

.digits {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}
.digit {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 2px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg-soft);
}
.digit small {
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}
.digit strong {
  font-size: 0.95rem;
  font-weight: 700;
}
.digit.padding {
  opacity: 0.35;
}
.digit.leading strong {
  color: var(--vp-c-text-3);
}
.digit.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.digit.active strong {
  color: var(--vp-c-brand-1);
}

.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge.ok {
  background: var(--vp-c-tip-soft);
  color: var(--vp-c-tip-1);
}
.badge.warn {
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-warning-1);
}

.link-btn {
  font-size: 0.8rem;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
}
.link-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.hint {
  margin: 0.6rem 0 0 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.88rem;
}
</style>
