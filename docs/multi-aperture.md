# Multi-Aperture Grid Support

This document describes the multi-aperture (mixed aperture sequence) grid feature added to WebDggrid.

## Overview

Multi-aperture grids allow you to specify different apertures for each resolution level, enabling more flexible grid configurations. Instead of using a single aperture value (3, 4, or 7) for all resolution levels, you can define a custom sequence.

## Basic Usage

### Single-Aperture Grid (Traditional)

```typescript
import { Webdggrid, Topology, Projection } from 'webdggrid';

const dggs = await Webdggrid.load();

// Standard grid with aperture 4 at all resolutions
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  aperture: 4,
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
}, 5);
```

### Multi-Aperture Grid (New)

```typescript
// Mixed aperture sequence: res1=4, res2=3, res3=4, res4=7, res5=4, res6=7
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  apertureSequence: "434747",  // Each character is the aperture for that resolution
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
}, 5);

// Use normally
const cells = dggs.nCells(5);
const cellIds = dggs.geoToSequenceNum([[0, 0]], 5);
```

## Constraints and Limitations

### Topology Restriction
- ✅ **HEXAGON** topology: Multi-aperture sequences are **supported**
- ❌ **TRIANGLE** topology: Not supported (will throw error)
- ❌ **DIAMOND** topology: Not supported (will throw error)

### Valid Aperture Values
Only three aperture values are allowed in sequences:
- `'3'` - Aperture 3 (3 child cells per parent)
- `'4'` - Aperture 4 (4 child cells per parent)
- `'7'` - Aperture 7 (7 child cells per parent)

Any other character will throw a validation error.

### Resolution Limits
The maximum resolution is limited by the length of the aperture sequence string:
```typescript
// Sequence length is 6, so maximum resolution is 6
apertureSequence: "434747"  // res 1-6 are valid

// Attempting resolution 7 will throw an error
dggs.nCells(7);  // ❌ Error: Resolution exceeds sequence length
```

### Addressing System Restrictions
Multi-aperture grids have the following addressing limitations:
- ❌ **SEQNUM** (sequence number) operations are **not supported**
  - `geoToSequenceNum()`, `sequenceNumToGeo()` will fail
  - This is a DGGRID library limitation
- ❌ **Z3/Z7 hierarchical indexing** is not supported
- ✅ Other addressing systems (GEO, Q2DI, Q2DD, PROJTRI, PLANE) work normally

## Validation

The implementation includes comprehensive validation at multiple levels:

### C++ Level Validation
```cpp
// Validates in dggrid_transform.cpp buildTransformer()
- Topology must be HEXAGON
- Sequence string must not be empty
- All characters must be '3', '4', or '7'
- Resolution must not exceed sequence length
```

### TypeScript Level
The TypeScript interface provides type safety and documentation:
```typescript
interface IDGGSProps {
    aperture?: 3 | 4 | 5 | 7;  // Optional if apertureSequence is provided
    apertureSequence?: string;  // Optional multi-aperture sequence
    // ...
}
```

## Examples

### Example 1: Planet Risk Grid
```typescript
// Replicate PlanetRisk-style grid (aperture 4, then mostly 7)
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  apertureSequence: "43334777777777777777777",
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
}, 10);
```

### Example 2: Custom Mixed Grid
```typescript
// Custom sequence for specific analysis needs
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  apertureSequence: "733447",
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
}, 6);

// Compare cell counts at each resolution
for (let res = 1; res <= 6; res++) {
    console.log(`Resolution ${res}: ${dggs.nCells(res)} cells`);
}
```

### Example 3: Error Handling
```typescript
try {
    dggs.setDggs({
        apertureSequence: "425",  // Invalid: '2' is not allowed
        topology: Topology.HEXAGON,
        projection: Projection.ISEA,
    }, 2);
    dggs.nCells(2);
} catch (error) {
    console.error(error.message);
    // "aperture_sequence contains invalid character '2'. Only '3', '4', and '7' are allowed."
}
```

### Testing

## Multi-Aperture Grid Example

This example demonstrates how to use multi-aperture (mixed aperture sequence) grids with WebDggrid.

### Running the Example

```bash
npm run build
node examples/multi-aperture-example.mjs
```

### Example Code

See [examples/multi-aperture-example.mjs](../examples/multi-aperture-example.mjs) for the complete source code.

### Example Output

```
═══════════════════════════════════════════════
  Multi-Aperture Grid Example
═══════════════════════════════════════════════

✓ DGGRID module loaded successfully

1. Standard Single-Aperture Grid (Aperture 4)
   ─────────────────────────────────────────
   Resolution 5:
   - Number of cells: 10,242
   - Cell area: 49811.10 km²

2. Multi-Aperture Grid (Sequence: "434747")
   ─────────────────────────────────────────
   This sequence means:
   - Resolution 1: aperture 4
   - Resolution 2: aperture 3
   - Resolution 3: aperture 4
   - Resolution 4: aperture 7
   - Resolution 5: aperture 4
   - Resolution 6: aperture 7

   Resolution 1 (aperture 4):           42 cells,  12751640.54 km²
   Resolution 2 (aperture 3):          122 cells,   4250546.85 km²
   Resolution 3 (aperture 4):          482 cells,   1062636.71 km²
   Resolution 4 (aperture 7):        3,362 cells,    151805.24 km²
   Resolution 5 (aperture 4):       13,442 cells,     37951.31 km²

3. Coordinate Conversion with Multi-Aperture Grid
   ─────────────────────────────────────────
   Converting geographic coordinates to cell IDs at resolution 5:

   [        0,        0] → Cell ID: 1
   [ -73.9857,  40.7484] → Cell ID: 1118
   [   2.2945,  48.8584] → Cell ID: 6385

4. Generate Cell Geometry (GeoJSON)
   ─────────────────────────────────────────
   Generated GeoJSON for cell 1:
   - Type: FeatureCollection
   - Features: 1
   - Cell vertices: 5 (pentagon)

5. Validation Examples
   ─────────────────────────────────────────
   ✓ Valid: apertureSequence with HEXAGON topology
     Configuration accepted

   ✗ Invalid configurations (validation in C++, error details may be limited)

═══════════════════════════════════════════════
  Example completed successfully!
═══════════════════════════════════════════════
```

### Key Features Demonstrated

1. **Standard single-aperture grid** - Traditional DGGRID configuration
2. **Multi-aperture grid** - Custom aperture sequence `"434747"` showing different apertures per resolution
3. **Grid statistics** - Cell counts and areas at each resolution level
4. **Coordinate conversion** - Converting lat/lng coordinates to cell IDs
5. **GeoJSON generation** - Creating polygon geometries for visualization
6. **Validation** - Examples of valid and invalid configurations

### Understanding the Output

#### Cell Count Progression

Notice how cell counts increase based on the aperture at each level:
- Resolution 1 → 2: multiplied by ~2.9x (aperture 3)
- Resolution 2 → 3: multiplied by ~4.0x (aperture 4)
- Resolution 3 → 4: multiplied by ~7.0x (aperture 7)
- Resolution 4 → 5: multiplied by ~4.0x (aperture 4)

#### Cell Area Reduction

Cell areas decrease proportionally at each resolution:
- Higher apertures = faster refinement
- Aperture 7 creates the most dramatic area reduction

#### Pentagon Cells

The example shows cell 1 has 5 vertices (pentagon). This is expected - every hexagonal DGGS contains exactly **12 pentagonal cells** at the vertices of the underlying icosahedron. These are not errors but fundamental geometric features of tiling a sphere.

### Common Use Cases

Multi-aperture grids are useful for:
- **Variable detail** - High refinement in areas of interest, coarser elsewhere
- **Computational efficiency** - Reduce cell count in less important regions
- **Legacy system compatibility** - Match existing grid systems like PlanetRisk
- **Hierarchical analysis** - Different granularity at different scales


## Technical Notes

### DGGRID Library Integration
This feature leverages the `DgHexIDGGS::makeRF()` factory function from the DGGRID v8 library, which supports the `DgApSeq` (Aperture Sequence) class for defining mixed aperture grids.

### Caching
The transformer cache includes aperture sequence information in the cache key, ensuring separate cached transformers for different aperture sequences.

### Performance
Multi-aperture grids have the same performance characteristics as single-aperture grids once the transformer is built and cached.

## References

- Original DGGRID documentation: `submodules/DGGRID/documentation/`
- DGGRID meta-file example: `submodules/DGGRID/examples/mixedAperture/mixedAperture.meta`
- PlanetRisk grid preset: `submodules/DGGRID/examples/planetRisk*/`
