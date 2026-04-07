# Address Types and Coordinate Systems

WebDGGRID provides multiple coordinate systems (address types) for representing cell locations and performing spatial operations. Each address type serves different purposes and offers unique advantages for specific use cases.

## Overview

A **coordinate system** or **address type** is a way to uniquely identify a position on the DGGS grid. WebDGGRID supports 10 different coordinate systems, organized into three categories:

| Category | Address Types | Purpose |
|----------|---------------|---------|
| **Primary** | GEO, SEQNUM | User-facing geographic and cell ID representations |
| **Low-Level** | PLANE, PROJTRI, Q2DD, Q2DI | Internal geometric coordinate systems |
| **Hierarchical** | VERTEX2DD, ZORDER, Z3, Z7 | Specialized indexing for spatial operations |

All coordinate systems are **convertible** — you can transform coordinates from any address type to any other address type for the same DGGS configuration.

---

## Primary Address Types

These are the most commonly used coordinate systems for working with DGGS cells.

### GEO (Geographic Coordinates)

**Format:** `{ lng, lat }` (longitude, latitude in decimal degrees)

Geographic coordinates represent positions on the Earth's surface using standard WGS84 latitude and longitude.

```typescript
// Convert geographic coordinates to cell IDs
const cellIds = dggs.geoToSequenceNum(
  [[-74.006, 40.7128]], // [lng, lat] - New York City
  5
);

// Convert cell IDs back to their center coordinates
const centers = dggs.sequenceNumToGeo([100n], 5);
// [[-0.015625, 0.013499...]]
```

**When to use:**
- Converting real-world lat/lng coordinates to DGGS cells
- Snapping GPS points to the nearest cell
- Displaying cell centers on a map
- Integrating with standard GIS workflows

**API Methods:**
- [`geoToSequenceNum()`](api/classes/Webdggrid.md#geotosequencenum) - Convert coordinates to cell IDs
- [`geoToGeo()`](api/classes/Webdggrid.md#geotogeo) - Snap coordinates to cell centers
- [`sequenceNumToGeo()`](api/classes/Webdggrid.md#sequencenumtogeo) - Get cell center coordinates
- [`geoToPlane()`](api/classes/Webdggrid.md#geotoplane) - Convert to PLANE coordinates
- [`geoToProjtri()`](api/classes/Webdggrid.md#geotoprojtri) - Convert to PROJTRI coordinates
- [`geoToQ2dd()`](api/classes/Webdggrid.md#geotoq2dd) - Convert to Q2DD coordinates
- [`geoToQ2di()`](api/classes/Webdggrid.md#geotoq2di) - Convert to Q2DI coordinates

---

### SEQNUM (Sequence Number)

**Format:** `bigint` (64-bit unsigned integer)

The sequence number is the **primary cell identifier** in WebDGGRID. Each cell at a given resolution has a unique sequence number.

```typescript
const seqnum = 12345n; // BigInt for large IDs

// Get cell polygon as GeoJSON
const geojson = dggs.sequenceNumToGridFeatureCollection([seqnum], 5);

// Get neighbors
const neighbors = dggs.sequenceNumNeighbors([seqnum], 5);

// Get parent at coarser resolution
const parent = dggs.sequenceNumParent([seqnum], 5);

// Get children at finer resolution
const children = dggs.sequenceNumChildren([seqnum], 4);
```

**Properties:**
- Unique within a DGGS configuration and resolution
- Sequential ordering (approximately follows a space-filling curve)
- Supports hierarchical parent-child relationships
- Can exceed JavaScript's safe integer range (hence `BigInt`)

**When to use:**
- Primary cell identifier for indexing and storage
- Computing cell relationships (neighbors, parent, children)
- Generating grid polygons
- Database keys for spatial data

**API Methods:**
- [`sequenceNumToGeo()`](api/classes/Webdggrid.md#sequencenumtogeo) - Get cell center
- [`sequenceNumToGridFeatureCollection()`](api/classes/Webdggrid.md#sequencenumtogridfeaturecollection) - Get cell polygons
- [`sequenceNumNeighbors()`](api/classes/Webdggrid.md#sequencenumneighbors) - Find adjacent cells
- [`sequenceNumParent()`](api/classes/Webdggrid.md#sequencenumparent) - Get parent cell
- [`sequenceNumChildren()`](api/classes/Webdggrid.md#sequencenumchildren) - Get child cells
- All hierarchical address conversions (see below)

---

## Low-Level Coordinate Systems

These coordinate systems expose DGGRID's internal geometric representations. Most users won't need these, but they're available for advanced geometric operations and debugging.

### PLANE (Planar Coordinates)

**Format:** `{ x, y }` (Cartesian coordinates in the projection plane)

Planar coordinates represent positions in a 2D Euclidean plane after the icosahedral faces have been unfolded and projected.

```typescript
const planeCoords = dggs.geoToPlane(
  [[-74.006, 40.7128]],
  5
);
// [{ x: 1.234, y: -0.567 }]
```

**When to use:**
- Geometric calculations in the projection plane
- Understanding the projection's distortion properties
- Debugging projection issues

---

### PROJTRI (Projected Triangle Coordinates)

**Format:** `{ tnum, x, y }` (triangle number + local coordinates)

Represents positions relative to one of the 20 triangular faces of the icosahedron after projection.

```typescript
const projTriCoords = dggs.geoToProjtri(
  [[0, 0]],
  5
);
// [{ tnum: 12, x: 0.456, y: 0.789 }]
```

**Properties:**
- `tnum`: Triangle number (0-19 for the 20 icosahedral faces)
- `x`, `y`: Local coordinates within the triangle

**When to use:**
- Working directly with icosahedral face geometry
- Understanding how points map to polyhedron faces
- Advanced projection calculations

---

### Q2DD (Quadrant Double Coordinates)

**Format:** `{ quad, x, y }` (quadrant number + floating-point coordinates)

Quadrant-based coordinate system using floating-point precision.

```typescript
const q2ddCoords = dggs.geoToQ2dd(
  [[0, 0]],
  5
);
// [{ quad: 7, x: 0.123, y: 0.456 }]
```

**Properties:**
- `quad`: Quadrant identifier
- `x`, `y`: Floating-point coordinates within the quadrant

**When to use:**
- Quadrant-based spatial indexing
- Precise geometric calculations
- Alternative to triangle-based addressing

---

### Q2DI (Quadrant Integer Coordinates)

**Format:** `{ quad, i, j }` (quadrant number + integer indices)

Quadrant-based coordinate system using integer grid indices.

```typescript
const q2diCoords = dggs.geoToQ2di(
  [[0, 0]],
  5
);
// [{ quad: 7, i: 42n, j: 13n }]
```

**Properties:**
- `quad`: Quadrant identifier
- `i`, `j`: Integer grid indices (BigInt)

**When to use:**
- Integer-based grid operations
- Avoiding floating-point precision issues
- Array-like indexing of cells

---

## Hierarchical Indexing Systems

These specialized address types provide alternative cell identifiers optimized for hierarchical operations and spatial indexing. See [Hierarchical Address Types](hierarchical-addresses.md) for detailed documentation.

### VERTEX2DD (Icosahedral Vertex Coordinates)

**Format:** `{ keep, vertNum, triNum, x, y }`

**Compatibility:** All apertures (3, 4, 7)

Represents positions relative to the icosahedron's vertices and triangular faces.

```typescript
const vertex = dggs.sequenceNumToVertex2DD(100n, 5);
// {
//   keep: true,
//   vertNum: 1,
//   triNum: 1,
//   x: 0.0625,
//   y: 0.054253...
// }

const seqnum = dggs.vertex2DDToSequenceNum(
  vertex.keep,
  vertex.vertNum,
  vertex.triNum,
  vertex.x,
  vertex.y,
  5
);
```

**When to use:**
- Low-level geometric operations
- Understanding icosahedral structure
- Cross-aperture compatible addressing

---

### ZORDER (Z-Order Space-Filling Curve)

**Format:** `bigint` (64-bit unsigned integer)

**Compatibility:** Aperture 3 and 4 only (NOT aperture 7)

Z-order (Morton code) interleaves coordinate bits to create a space-filling curve with good locality properties.

```typescript
// Only works with aperture 3 or 4
dggs.setDggs({ aperture: 4, /* ... */ }, 5);

const zorder = dggs.sequenceNumToZOrder(100n, 5);
// 1168684103302643712n

const seqnum = dggs.zOrderToSequenceNum(zorder, 5);
// 100n
```

**When to use:**
- Spatial range queries in databases
- Efficient nearest-neighbor searches
- Clustering spatially close cells
- Aperture 3 or 4 grids only

::: warning
ZORDER is NOT available for aperture 7 grids. Use [Z7](#z7-base-7-central-place-indexing) instead.
:::

---

### Z3 (Base-3 Central Place Indexing)

**Format:** `bigint` (64-bit signed integer)

**Compatibility:** Aperture 3 hexagons only

Base-3 hierarchical index optimized for aperture 3 grids where each parent contains exactly 3 children.

```typescript
// Only works with aperture 3
dggs.setDggs({ aperture: 3, topology: 'HEXAGON', /* ... */ }, 5);

const z3 = dggs.sequenceNumToZ3(100n, 5);
// 1773292353277132799n

const seqnum = dggs.z3ToSequenceNum(z3, 5);
// 100n
```

**When to use:**
- Aperture 3 hexagon grid indexing
- Hierarchical parent-child operations
- Base-3 arithmetic on coordinates
- Spatial databases with aperture 3

::: warning
Z3 requires aperture 3 hexagon grids specifically.
:::

---

### Z7 (Base-7 Central Place Indexing)

**Format:** `bigint` (64-bit signed integer, often displayed in hex)

**Compatibility:** Aperture 7 hexagons only

Base-7 hierarchical index optimized for aperture 7 grids where each parent contains exactly 7 children. Uses pure bitarithmetic operations.

```typescript
// Only works with aperture 7
dggs.setDggs({ aperture: 7, topology: 'HEXAGON', /* ... */ }, 5);

const z7 = dggs.sequenceNumToZ7(100n, 5);
// 1153167795211468799n (hex: 0x1000000000000fff)

const seqnum = dggs.z7ToSequenceNum(z7, 5);
// 100n
```

**When to use:**
- Aperture 7 hexagon grid indexing
- High-resolution grid applications
- Hierarchical operations with 7-way branching
- Bitwise coordinate manipulation

::: warning
Z7 requires aperture 7 hexagon grids specifically.
:::

---

## Coordinate System Conversion Reference

This table shows all available conversions between address types:

| From ↓ / To → | GEO | SEQNUM | PLANE | PROJTRI | Q2DD | Q2DI | VERTEX2DD | ZORDER¹ | Z3² | Z7³ |
|---------------|-----|--------|-------|---------|------|------|-----------|---------|-----|-----|
| **GEO** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM |
| **SEQNUM** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **PLANE** | — | — | — | — | — | — | — | — | — | — |
| **PROJTRI** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM |
| **Q2DD** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM |
| **Q2DI** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM |
| **VERTEX2DD** | via SEQNUM | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | — | via SEQNUM | via SEQNUM | via SEQNUM |
| **ZORDER** | via SEQNUM | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | — | via SEQNUM | via SEQNUM |
| **Z3** | via SEQNUM | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | — | via SEQNUM |
| **Z7** | via SEQNUM | ✓ | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | via SEQNUM | — |

**Notes:**
1. **ZORDER**: Only available for aperture 3 and 4 (not 7)
2. **Z3**: Only available for aperture 3 hexagon grids
3. **Z7**: Only available for aperture 7 hexagon grids
4. **"via SEQNUM"**: Convert to SEQNUM first, then to target type
5. **"—"**: Direct conversion not implemented (use SEQNUM as intermediate)

### Conversion Strategy

For most conversions, **SEQNUM is the universal intermediate format**. To convert from type A to type B:

1. Convert A → SEQNUM
2. Convert SEQNUM → B

```typescript
// Example: GEO → Z3 (aperture 3)
const seqnum = dggs.geoToSequenceNum([[-74.006, 40.7128]], 5)[0];
const z3 = dggs.sequenceNumToZ3(seqnum, 5);
```

---

## Choosing the Right Address Type

Use this decision guide to select the appropriate address type:

### For General Use

| Task | Recommended Address Type |
|------|--------------------------|
| Store cell identifiers | **SEQNUM** |
| Work with lat/lng | **GEO** |
| Generate map visualization | **GEO** + `sequenceNumToGridFeatureCollection()` |
| Find neighbors | **SEQNUM** + `sequenceNumNeighbors()` |
| Hierarchical operations | **SEQNUM** + `sequenceNumParent()`/`Children()` |

### For Advanced Spatial Indexing

| Grid Type | Recommended Address Type |
|-----------|--------------------------|
| Aperture 3 hexagons | **Z3** (hierarchical index) or **ZORDER** (range queries) |
| Aperture 4 hexagons | **ZORDER** (range queries) |
| Aperture 7 hexagons | **Z7** (hierarchical index) |
| Any aperture | **VERTEX2DD** (cross-aperture compatible) |

### For Geometric Operations

| Operation | Recommended Address Type |
|-----------|--------------------------|
| Projection calculations | **PLANE** |
| Icosahedral face work | **PROJTRI** |
| Quadrant-based indexing | **Q2DD** or **Q2DI** |
| Integer grid indexing | **Q2DI** |

---

## Performance Considerations

### Conversion Performance

All coordinate conversions are implemented in C++ and compiled to WebAssembly for optimal performance. Conversions are cached internally.

**Relative speeds:**
- **GEO ↔ SEQNUM**: Very fast, direct conversion
- **SEQNUM → Hierarchical**: Fast, reference frame lookups
- **Low-level coordinates**: Fast, geometric transformations
- **Multi-hop conversions**: Slightly slower (convert via SEQNUM)

### Memory Usage

| Address Type | Memory per Cell |
|--------------|-----------------|
| SEQNUM | 8 bytes (BigInt) |
| GEO | 16 bytes (2 doubles) |
| VERTEX2DD | 32+ bytes (object with 5 fields) |
| ZORDER, Z3, Z7 | 8 bytes (BigInt) |
| PLANE, PROJTRI, Q2DD | 24 bytes (object with 2-3 doubles) |
| Q2DI | 24 bytes (object with BigInts) |

### Best Practices

1. **Store SEQNUM**: Use sequence numbers as primary identifiers in databases
2. **Convert on demand**: Convert to GEO only when displaying or analyzing
3. **Batch operations**: Use array methods for multiple cells simultaneously
4. **Cache results**: Avoid redundant conversions of the same coordinates
5. **Use appropriate precision**: Consider Q2DI for integer-only operations

---

## Error Handling

Some address types have aperture or topology restrictions:

| Address Type | Restriction | Error Behavior |
|--------------|-------------|----------------|
| ZORDER | Aperture 3 or 4 only | Throws error for aperture 7 |
| Z3 | Aperture 3 hexagons only | Throws error for other configs |
| Z7 | Aperture 7 hexagons only | Throws error for other configs |
| VERTEX2DD | No restrictions | Works with all configurations |

Example error handling:

```typescript
try {
  // This will throw if not aperture 7
  const z7 = dggs.sequenceNumToZ7(100n, 5);
} catch (error) {
  console.error(error.message);
  // "Z7 is only available for aperture 7 hexagon grids.
  //  Current configuration: aperture 4, topology HEXAGON."
}
```

---

## Examples

### Example 1: Multi-Format Cell Representation

```typescript
import { Webdggrid, Topology } from 'webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: 'ISEA',
  aperture: 3,
}, 5);

const cell = 100n;

// Get all available representations
console.log('Cell representations for SEQNUM', cell);
console.log('  GEO:', dggs.sequenceNumToGeo([cell], 5)[0]);

const vertex = dggs.sequenceNumToVertex2DD(cell, 5);
console.log('  VERTEX2DD:', vertex);

const z3 = dggs.sequenceNumToZ3(cell, 5);
console.log('  Z3:', z3);

const zorder = dggs.sequenceNumToZOrder(cell, 5);
console.log('  ZORDER:', zorder);

// All convert back to the same SEQNUM
console.log('  VERTEX2DD → SEQNUM:', 
  dggs.vertex2DDToSequenceNum(
    vertex.keep, vertex.vertNum, vertex.triNum, vertex.x, vertex.y, 5
  )
);
console.log('  Z3 → SEQNUM:', dggs.z3ToSequenceNum(z3, 5));
console.log('  ZORDER → SEQNUM:', dggs.zOrderToSequenceNum(zorder, 5));
```

### Example 2: Spatial Query with ZORDER

```typescript
// Use ZORDER for efficient range queries (aperture 4)
dggs.setDggs({ aperture: 4, /* ... */ }, 7);

const cells = dggs.geoToSequenceNum([
  [-122.4194, 37.7749],  // San Francisco
  [-122.4183, 37.7750],  // Nearby point
], 7);

// Convert to ZORDER for spatial indexing
const zorders = cells.map(c => dggs.sequenceNumToZOrder(c, 7));

// In a real application, store zorders in database
// and query ranges for efficient spatial lookups
console.log('ZORDER values:', zorders);
// Spatially close cells have similar ZORDER values
```

### Example 3: Hierarchical Navigation with Z7

```typescript
// Use Z7 for clean hierarchical indexing (aperture 7)
dggs.setDggs({ aperture: 7, topology: 'HEXAGON', /* ... */ }, 5);

const parentCell = 25n;
const children = dggs.sequenceNumChildren([parentCell], 4)[0];

// Convert to Z7 hierarchical indices
const parentZ7 = dggs.sequenceNumToZ7(parentCell, 4);
const childrenZ7 = children.map(c => dggs.sequenceNumToZ7(c, 5));

console.log('Parent Z7:', parentZ7.toString(16)); // hex format
console.log('Children Z7:', childrenZ7.map(z => z.toString(16)));
// Parent-child relationship visible in hex representation
```

---

## Related Documentation

- [Hierarchical Address Types](hierarchical-addresses.md) - Detailed guide to VERTEX2DD, ZORDER, Z3, Z7
- [Hierarchical Operations](hierarchical-operations.md) - Parent-child relationships
- [Multi-Aperture Grids](multi-aperture.md) - Mixed aperture sequences
- [API Reference](api/) - Complete method documentation

---

## Technical Details

### DGGRID Reference Frames

WebDGGRID's coordinate systems are implemented using DGGRID v8.44's reference frame system (`DgRFBase`):

| Address Type | DGGRID Reference Frame |
|--------------|------------------------|
| GEO | `DgGeoSphRF` |
| SEQNUM | `DgIDGGS` (sequence number RF) |
| PLANE | `DgPlaneTriRF` |
| PROJTRI | `DgProjTriRF` |
| Q2DD | `DgQ2DDRF` |
| Q2DI | `DgQ2DIRF` |
| VERTEX2DD | `DgVertex2DDRF` |
| ZORDER | `DgZOrderRF` |
| Z3 | `DgZ3RF` |
| Z7 | `DgZ7RF` |

All conversions use DGGRID's `DgConverter` system with intelligent caching for performance.

### Coordinate Precision

- **GEO**: IEEE-754 double precision (15-17 decimal digits)
- **SEQNUM**: Exact 64-bit unsigned integer (BigInt)
- **Hierarchical indices**: Exact 64-bit signed/unsigned integer (BigInt)
- **Low-level coordinates**: IEEE-754 double precision with possible quantization

### Thread Safety

WebDGGRID maintains internal caches for DGGS configurations. All methods are safe for concurrent use in web workers or parallel contexts as long as `setDggs()` is not called simultaneously from multiple threads.
