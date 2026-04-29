// One-off diagnostic: cell seqnum=180 at res=3 (south polar cap) reportedly
// renders with broken hex borders. Compare the raw WASM output to what
// sequenceNumToGrid returns after unwrapAntimeridianRing.

import { describe, test, beforeAll, expect } from 'vitest';
import { Webdggrid } from '../../lib-esm/webdggrid';

describe('south polar cell 180 @ res 3 — provenance of broken geometry', () => {
    let dggs: any;
    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    test('dump raw module output vs TS-wrapped ring', () => {
        const seq = 180n;
        const res = 3;

        // Configure DGGS the same way DggsGlobe does at default settings.
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: 'HEXAGON',
            projection: 'ISEA',
            aperture: 4,
        }, res);

        // ── 1. Raw WASM call: copy of what sequenceNumToGrid does, but
        //      WITHOUT unwrapAntimeridianRing. ────────────────────────────
        const raw = dggs._module.SeqNumGrid(
            0,           // poleLng
            0,           // poleLat
            0,           // azimuth
            4,           // aperture
            res,
            'HEXAGON',
            'ISEA',
            false,       // isApertureSequence
            '',          // apSeq
            [seq],
        );
        const inputSize = 1;
        const numVerts = raw[0];
        const xOff = inputSize;
        const yOff = inputSize + numVerts;
        const rawRing: [number, number][] = [];
        for (let j = 0; j < numVerts; j++) {
            rawRing.push([raw[xOff + j], raw[yOff + j]]);
        }

        // ── 2. TS-wrapped ring (goes through unwrapAntimeridianRing) ────
        const wrappedRings = dggs.sequenceNumToGrid([seq], res);
        const wrappedRing = wrappedRings[0];

        // ── 3. FC form (this is what the demo logs) ─────────────────────
        const fc = dggs.sequenceNumToGridFeatureCollection([seq], res);
        const fcRing = fc.features[0].geometry.coordinates[0];

        console.log('\n=== RAW WASM (no unwrap) ===');
        rawRing.forEach((v, i) => console.log(`  [${i}] lng=${v[0].toFixed(6)} lat=${v[1].toFixed(6)}`));
        const rawLngs = rawRing.map(v => v[0]);
        console.log(`  span: min=${Math.min(...rawLngs).toFixed(3)} max=${Math.max(...rawLngs).toFixed(3)} delta=${(Math.max(...rawLngs) - Math.min(...rawLngs)).toFixed(3)}`);

        console.log('\n=== sequenceNumToGrid (unwrap applied) ===');
        wrappedRing.forEach((v: any, i: number) => console.log(`  [${i}] lng=${v[0].toFixed(6)} lat=${v[1].toFixed(6)}`));
        const wrLngs = wrappedRing.map((v: any) => v[0]);
        console.log(`  span: min=${Math.min(...wrLngs).toFixed(3)} max=${Math.max(...wrLngs).toFixed(3)} delta=${(Math.max(...wrLngs) - Math.min(...wrLngs)).toFixed(3)}`);

        console.log('\n=== sequenceNumToGridFeatureCollection (closed ring) ===');
        fcRing.forEach((v: any, i: number) => console.log(`  [${i}] lng=${v[0].toFixed(6)} lat=${v[1].toFixed(6)}`));

        // sanity: wrapped ring is the same length as raw
        expect(wrappedRing.length).toBe(rawRing.length);
        expect(fcRing.length).toBe(rawRing.length + 1); // closed
    });
});
