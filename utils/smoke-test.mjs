/**
 * Smoke test for the built dist/ output.
 *
 * Imports Webdggrid from dist/index.js (the same file published to npm and
 * served via jsDelivr) and runs a handful of sanity checks.  Exits with a
 * non-zero code on any failure so CI catches regressions.
 *
 * Usage:  node utils/smoke-test.mjs
 */

import { Webdggrid } from '../dist/index.js'

let passed = 0
let failed = 0

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓  ${label}`)
    passed++
  } else {
    console.error(`  ✗  ${label}`)
    console.error(`     expected: ${JSON.stringify(expected)}`)
    console.error(`     received: ${JSON.stringify(actual)}`)
    failed++
  }
}

console.log('\nLoading Webdggrid WASM…')
const dggs = await Webdggrid.load()
console.log('WASM loaded.\n')

// ── ISEA4H aperture-4 ────────────────────────────────────────────────────────

dggs.setDggs(
  { poleCoordinates: { lat: 0, lng: 0 }, azimuth: 0, topology: 'HEXAGON', projection: 'ISEA', aperture: 4 },
  3,
)

assert('nCells(3) ISEA4H → 642', dggs.nCells(3), 642)

const fc = dggs.sequenceNumToGridFeatureCollection([1n, 2n, 3n], 3)
assert('featureCollection type', fc.type, 'FeatureCollection')
assert('feature count', fc.features.length, 3)
assert('geometry type', fc.features[0].geometry.type, 'Polygon')

// ── ISEA3H aperture-3 ────────────────────────────────────────────────────────

dggs.setDggs(
  { poleCoordinates: { lat: 0, lng: 0 }, azimuth: 0, topology: 'HEXAGON', projection: 'ISEA', aperture: 3 },
  3,
)

assert('nCells(3) ISEA3H → 272', dggs.nCells(3), 272)

// ── TRIANGLE ─────────────────────────────────────────────────────────────────

dggs.setDggs(
  { poleCoordinates: { lat: 0, lng: 0 }, azimuth: 0, topology: 'TRIANGLE', projection: 'ISEA', aperture: 4 },
  2,
)

const nTri = dggs.nCells(2)
assert('nCells(2) TRIANGLE > 0', nTri > 0, true)

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
