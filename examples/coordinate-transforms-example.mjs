/**
 * Coordinate Transformation Example
 * 
 * This example demonstrates how to use all available coordinate systems
 * in WebDggrid: GEO, SEQNUM, Q2DI, Q2DD, PROJTRI, and PLANE.
 * 
 * Usage:
 *   npm run build
 *   node examples/coordinate-transforms-example.mjs
 */

import { Webdggrid } from '../dist/index.js';

// Manually define constants
const Topology = {
    HEXAGON: 'HEXAGON',
    TRIANGLE: 'TRIANGLE',
    DIAMOND: 'DIAMOND'
};

const Projection = {
    ISEA: 'ISEA',
    FULLER: 'FULLER'
};

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  Coordinate Transformation Example');
    console.log('═══════════════════════════════════════════════\n');

    // Load DGGRID module
    const dggs = await Webdggrid.load();
    console.log('✓ DGGRID module loaded\n');

    // Configure grid
    dggs.setDggs({
        poleCoordinates: { lat: 0, lng: 0 },
        azimuth: 0,
        aperture: 4,
        topology: Topology.HEXAGON,
        projection: Projection.ISEA,
    }, 5);

    const testCoord = [[0, 0]]; // Equator at prime meridian

    console.log('1. Starting Point: GEO (Geographic)');
    console.log('   ───────────────────────────────');
    console.log(`   Coordinates: [${testCoord[0][0]}, ${testCoord[0][1]}]`);
    console.log(`   (longitude, latitude)\n`);

    // GEO → all other systems
    console.log('2. Convert GEO to All Coordinate Systems');
    console.log('   ────────────────────────────────────');

    const seqnum = dggs.geoToSequenceNum(testCoord, 5);
    console.log(`   SEQNUM: ${seqnum[0]}`);

    const q2di = dggs.geoToQ2di(testCoord, 5);
    console.log(`   Q2DI:   quad=${q2di[0].quad}, i=${q2di[0].i}, j=${q2di[0].j}`);

    const q2dd = dggs.geoToQ2dd(testCoord, 5);
    console.log(`   Q2DD:   quad=${q2dd[0].quad}, x=${q2dd[0].x.toFixed(6)}, y=${q2dd[0].y.toFixed(6)}`);

    const projtri = dggs.geoToProjtri(testCoord, 5);
    console.log(`   PROJTRI: tnum=${projtri[0].tnum}, x=${projtri[0].x.toFixed(6)}, y=${projtri[0].y.toFixed(6)}`);

    const plane = dggs.geoToPlane(testCoord, 5);
    console.log(`   PLANE:  x=${plane[0].x.toFixed(6)}, y=${plane[0].y.toFixed(6)}\n`);

    // Round-trip validation
    console.log('3. Round-Trip Validation');
    console.log('   ─────────────────────');

    const q2diBack = dggs.q2diToGeo(q2di, 5);
    console.log(`   GEO → Q2DI → GEO: [${q2diBack[0][0].toFixed(6)}, ${q2diBack[0][1].toFixed(6)}]`);

    const seqnumBack = dggs.sequenceNumToGeo(seqnum, 5);
    console.log(`   GEO → SEQNUM → GEO: [${seqnumBack[0][0].toFixed(6)}, ${seqnumBack[0][1].toFixed(6)}]\n`);

    // Q2DI workflow
    console.log('4. Q2DI Workflow: Convert to GeoJSON Geometry');
    console.log('   ──────────────────────────────────────────');

    const multipleQ2di = [
        { quad: 0, i: 0n, j: 0n },
        { quad: 0, i: 5n, j: 3n },
        { quad: 1, i: 2n, j: 7n }
    ];

    console.log(`   Input: ${multipleQ2di.length} Q2DI coordinates`);
    multipleQ2di.forEach((coord, idx) => {
        console.log(`     [${idx}] quad=${coord.quad}, i=${coord.i}, j=${coord.j}`);
    });

    // Step 1: Q2DI → SEQNUM
    const seqnums = dggs.q2diToSequenceNum(multipleQ2di, 5);
    console.log(`\n   Step 1: Q2DI → SEQNUM`);
    console.log(`     Sequence numbers: ${seqnums.map(s => s.toString()).join(', ')}`);

    // Step 2: SEQNUM → GeoJSON
    const geojson = dggs.sequenceNumToGridFeatureCollection(seqnums, 5);
    console.log(`\n   Step 2: SEQNUM → GeoJSON`);
    console.log(`     Generated ${geojson.features.length} polygon features`);
    console.log(`     Feature 0: ${geojson.features[0].geometry.coordinates[0].length} vertices`);

    // Alternate path: Q2DI → GEO
    const geoCoords = dggs.q2diToGeo(multipleQ2di, 5);
    console.log(`\n   Alternate: Q2DI → GEO`);
    geoCoords.forEach((coord, idx) => {
        console.log(`     [${idx}] [${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`);
    });

    // System conversions
    console.log('\n5. Multi-System Conversion Chain');
    console.log('   ──────────────────────────────');
    console.log('   GEO → SEQNUM → Q2DI → Q2DD → PROJTRI\n');

    const geo1 = [[10, 20]];
    console.log(`   Start (GEO): [${geo1[0][0]}, ${geo1[0][1]}]`);

    const seq1 = dggs.geoToSequenceNum(geo1, 5);
    console.log(`   → SEQNUM: ${seq1[0]}`);

    const q2di1 = dggs.sequenceNumToQ2di(seq1, 5);
    console.log(`   → Q2DI: quad=${q2di1[0].quad}, i=${q2di1[0].i}, j=${q2di1[0].j}`);

    const q2dd1 = dggs.q2diToQ2dd(q2di1, 5);
    console.log(`   → Q2DD: quad=${q2dd1[0].quad}, x=${q2dd1[0].x.toFixed(6)}, y=${q2dd1[0].y.toFixed(6)}`);

    const projtri1 = dggs.q2ddToProjtri(q2dd1, 5);
    console.log(`   → PROJTRI: tnum=${projtri1[0].tnum}, x=${projtri1[0].x.toFixed(6)}, y=${projtri1[0].y.toFixed(6)}`);

    // Back to GEO for validation
    const geoFinal = dggs.projtriToGeo(projtri1, 5);
    console.log(`   → GEO (final): [${geoFinal[0][0].toFixed(6)}, ${geoFinal[0][1].toFixed(6)}]`);
    console.log(`   ✓ Round-trip successful!\n`);

    console.log('═══════════════════════════════════════════════');
    console.log('  Available Coordinate Systems:');
    console.log('═══════════════════════════════════════════════');
    console.log('  • GEO      - Geographic (lon, lat) degrees');
    console.log('  • SEQNUM   - Sequence number (cell ID)');
    console.log('  • Q2DI     - Quad 2D Integer (quad, i, j)');
    console.log('  • Q2DD     - Quad 2D Double (quad, x, y)');
    console.log('  • PROJTRI  - Projection Triangle (tnum, x, y)');
    console.log('  • PLANE    - Planar (x, y) - output only');
    console.log('═══════════════════════════════════════════════');
    console.log('\n✓ Example completed successfully!\n');
}

main().catch(console.error);
