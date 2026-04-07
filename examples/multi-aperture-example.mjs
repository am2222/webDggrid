/**
 * Multi-Aperture Grid Example
 * 
 * This example demonstrates how to use multi-aperture (mixed aperture sequence) grids
 * with WebDggrid. Multi-aperture grids allow you to specify different apertures for
 * each resolution level.
 * 
 * Usage:
 *   npm run build
 *   node examples/multi-aperture-example.mjs
 */

import { Webdggrid } from '../dist/index.js';

// Manually define topology and projection constants
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
    console.log('  Multi-Aperture Grid Example');
    console.log('═══════════════════════════════════════════════\n');

    // Load the DGGRID WebAssembly module
    const dggs = await Webdggrid.load();
    console.log('✓ DGGRID module loaded successfully\n');

    // Example 1: Standard single aperture grid (aperture-4)
    console.log('1. Standard Single-Aperture Grid (Aperture 4)');
    console.log('   ─────────────────────────────────────────');
    dggs.setDggs({
        poleCoordinates: { lat: 0, lng: 0 },
        azimuth: 0,
        aperture: 4,
        topology: Topology.HEXAGON,
        projection: Projection.ISEA,
    }, 5);

    const cells4 = dggs.nCells(5);
    const area4 = dggs.cellAreaKM(5);
    console.log(`   Resolution 5:`);
    console.log(`   - Number of cells: ${cells4.toLocaleString()}`);
    console.log(`   - Cell area: ${area4.toFixed(2)} km²\n`);

    // Example 2: Multi-aperture grid (sequence: "434747")
    console.log('2. Multi-Aperture Grid (Sequence: "434747")');
    console.log('   ─────────────────────────────────────────');
    console.log('   This sequence means:');
    console.log('   - Resolution 1: aperture 4');
    console.log('   - Resolution 2: aperture 3');
    console.log('   - Resolution 3: aperture 4');
    console.log('   - Resolution 4: aperture 7');
    console.log('   - Resolution 5: aperture 4');
    console.log('   - Resolution 6: aperture 7');

    dggs.setDggs({
        poleCoordinates: { lat: 0, lng: 0 },
        azimuth: 0,
        apertureSequence: "434747",  // Mixed aperture sequence
        topology: Topology.HEXAGON,
        projection: Projection.ISEA,
    }, 5);

    console.log('');
    for (let res = 1; res <= 5; res++) {
        const cells = dggs.nCells(res);
        const area = dggs.cellAreaKM(res);
        const aperture = "434747"[res - 1];
        console.log(`   Resolution ${res} (aperture ${aperture}): ${cells.toLocaleString().padStart(12)} cells, ${area.toFixed(2).padStart(12)} km²`);
    }
    console.log('');

    // Example 3: Convert coordinates with multi-aperture grid
    console.log('3. Coordinate Conversion with Multi-Aperture Grid');
    console.log('   ─────────────────────────────────────────');

    const testPoints = [
        [0, 0],          // Null Island
        [-73.9857, 40.7484],  // New York
        [2.2945, 48.8584],    // Paris
    ];

    console.log('   Converting geographic coordinates to cell IDs at resolution 5:\n');
    const cellIds = dggs.geoToSequenceNum(testPoints, 5);

    testPoints.forEach((point, idx) => {
        console.log(`   [${point[0].toString().padStart(9)}, ${point[1].toString().padStart(8)}] → Cell ID: ${cellIds[idx]}`);
    });
    console.log('');

    // Example 4: Generate cell geometry
    console.log('4. Generate Cell Geometry (GeoJSON)');
    console.log('   ─────────────────────────────────────────');
    const sampleCellId = cellIds[0];
    const geojson = dggs.sequenceNumToGridFeatureCollection([sampleCellId], 5);

    console.log(`   Generated GeoJSON for cell ${sampleCellId}:`);
    console.log(`   - Type: ${geojson.type}`);
    console.log(`   - Features: ${geojson.features.length}`);
    console.log(`   - Cell vertices: ${geojson.features[0].geometry.coordinates[0].length - 1}`);
    console.log('');

    // Example 5: Demonstrate validation (catching errors)
    console.log('5. Validation Examples');
    console.log('   ─────────────────────────────────────────');

    // This will work
    console.log('   ✓ Valid: apertureSequence with HEXAGON topology');
    dggs.setDggs({
        poleCoordinates: { lat: 0, lng: 0 },
        azimuth: 0,
        apertureSequence: "3377",
        topology: Topology.HEXAGON,
        projection: Projection.ISEA,
    }, 2);
    console.log('     Configuration accepted\n');

    // These will fail with appropriate error messages:
    console.log('   ✗ Invalid: apertureSequence with TRIANGLE topology');
    try {
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            apertureSequence: "434",
            topology: Topology.TRIANGLE,  // Not allowed!
            projection: Projection.ISEA,
        }, 2);
        dggs.nCells(2);  // Trigger the validation
    } catch (error) {
        console.log(`     Error caught: ${error.message}\n`);
    }

    console.log('   ✗ Invalid: aperture sequence with invalid character');
    try {
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            apertureSequence: "425",  // '2' is not valid (only 3, 4, 7 allowed)
            topology: Topology.HEXAGON,
            projection: Projection.ISEA,
        }, 2);
        dggs.nCells(2);
    } catch (error) {
        console.log(`     Error caught: ${error.message}\n`);
    }

    console.log('   ✗ Invalid: resolution exceeds sequence length');
    try {
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            apertureSequence: "434",  // Length 3
            topology: Topology.HEXAGON,
            projection: Projection.ISEA,
        }, 5);  // Resolution 5 exceeds length!
        dggs.nCells(5);
    } catch (error) {
        console.log(`     Error caught: ${error.message}\n`);
    }

    console.log('═══════════════════════════════════════════════');
    console.log('  Example completed successfully!');
    console.log('═══════════════════════════════════════════════');
}

main().catch(console.error);
