# Hierarchical Address Types

WebDGGRID supports multiple hierarchical indexing systems for converting between sequence numbers (SEQNUM) and specialized coordinate representations. Each address type offers different properties optimized for specific use cases.

## Overview

In addition to the standard SEQNUM (sequence number) addressing, WebDGGRID provides four hierarchical address types:

| Address Type | Description | Aperture Support | Use Case |
|--------------|-------------|------------------|----------|
| **VERTEX2DD** | Icosahedral vertex coordinates | All apertures (3, 4, 7) | Low-level geometric operations |
| **ZORDER** | Z-order space-filling curve | Aperture 3, 4 only | Spatial range queries |
| **Z3** | Base-3 Central Place Indexing | Aperture 3 hexagons only | Aperture 3 hierarchical indexing |
| **Z7** | Base-7 Central Place Indexing | Aperture 7 hexagons only | Aperture 7 hierarchical indexing |

## VERTEX2DD

VERTEX2DD addresses represent cell positions relative to the vertices and triangular faces of the underlying icosahedron. This is the most fundamental coordinate system in DGGRID.

### Properties

A VERTEX2DD coordinate consists of five components:

```typescript
{
  keep: boolean,      // Whether to keep this vertex
  vertNum: number,    // Vertex number (0-11 for icosahedron)
  triNum: number,     // Triangle number on the icosahedron
  x: number,          // X coordinate within the triangle
  y: number           // Y coordinate within the triangle
}
```

### API

```typescript
// Convert SEQNUM to VERTEX2DD
const vertex = dggs.sequenceNumToVertex2DD(seqnum, resolution);

// Convert VERTEX2DD to SEQNUM
const seqnum = dggs.vertex2DDToSequenceNum(
  keep, vertNum, triNum, x, y, resolution
);
```

### Example

```typescript
import { Webdggrid, Topology } from 'webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: 'ISEA',
  aperture: 4,
}, 5);

// Convert a cell to VERTEX2DD coordinates
const seqnum = 100n;
const vertex = dggs.sequenceNumToVertex2DD(seqnum, 5);
console.log(vertex);
// {
//   keep: true,
//   vertNum: 1,
//   triNum: 1,
//   x: 0.0625,
//   y: 0.05425347222222222
// }

// Convert back to SEQNUM
const backToSeqnum = dggs.vertex2DDToSequenceNum(
  vertex.keep,
  vertex.vertNum,
  vertex.triNum,
  vertex.x,
  vertex.y,
  5
);
console.log(backToSeqnum); // 100n
```

## ZORDER

ZORDER uses digit-interleaved coordinates to create a Z-order space-filling curve index. This representation provides good spatial locality, making it useful for range queries and spatial indexing.

### Compatibility

::: warning Aperture Restriction
ZORDER is **only available** for aperture 3 and 4 hexagon grids. It is **NOT supported** for aperture 7.
:::

### API

```typescript
// Convert SEQNUM to ZORDER
const zorder = dggs.sequenceNumToZOrder(seqnum, resolution);

// Convert ZORDER to SEQNUM
const seqnum = dggs.zOrderToSequenceNum(zorder, resolution);
```

### Example

```typescript
import { Webdggrid, Topology } from 'webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: 'ISEA',
  aperture: 4,  // Works with aperture 3 or 4
}, 5);

const seqnum = 100n;
const zorder = dggs.sequenceNumToZOrder(seqnum, 5);
console.log(zorder); // 1168684103302643712n

const backToSeqnum = dggs.zOrderToSequenceNum(zorder, 5);
console.log(backToSeqnum); // 100n
```

### Use Cases

- **Spatial indexing**: Store ZORDER values in databases for efficient spatial queries
- **Range queries**: Query cells within a spatial range using ZORDER bounds
- **Clustering**: Cells with similar ZORDER values are spatially close

### Error Handling

```typescript
// This will throw an error
dggs.setDggs({
  // ... other params
  aperture: 7,  // ❌ Not supported
}, 5);

try {
  const zorder = dggs.sequenceNumToZOrder(100n, 5);
} catch (error) {
  console.error(error.message);
  // "ZORDER is not available for aperture 7.
  //  Use Z7 hierarchical indexing instead, or switch to aperture 3 or 4."
}
```

## Z3

Z3 uses base-3 digit encoding optimized for aperture 3 hexagon grids. Each parent cell contains exactly 3 children in the hierarchy, making Z3 a natural fit for aperture 3 DGGS.

### Compatibility

::: warning Aperture Restriction
Z3 is **only available** for aperture 3 hexagon grids.
:::

### API

```typescript
// Convert SEQNUM to Z3
const z3 = dggs.sequenceNumToZ3(seqnum, resolution);

// Convert Z3 to SEQNUM
const seqnum = dggs.z3ToSequenceNum(z3, resolution);
```

### Example

```typescript
import { Webdggrid, Topology } from 'webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: 'ISEA',
  aperture: 3,  // Must be aperture 3
}, 5);

const seqnum = 100n;
const z3 = dggs.sequenceNumToZ3(seqnum, 5);
console.log(z3); // 1773292353277132799n (INT64 format)

const backToSeqnum = dggs.z3ToSequenceNum(z3, 5);
console.log(backToSeqnum); // 100n
```

### Use Cases

- **Hierarchical indexing**: Efficient parent-child relationships for aperture 3 grids
- **Base-3 arithmetic**: Direct manipulation of hierarchical coordinates
- **Spatial databases**: Store Z3 values for aperture 3 grid indexing

### Error Handling

```typescript
// This will throw an error for aperture 4 or 7
dggs.setDggs({
  // ... other params
  aperture: 4,  // ❌ Not supported
}, 5);

try {
  const z3 = dggs.sequenceNumToZ3(100n, 5);
} catch (error) {
  console.error(error.message);
  // "Z3 is only available for aperture 3 hexagon grids.
  //  Current configuration: aperture 4, topology HEXAGON."
}
```

## Z7

Z7 uses base-7 digit encoding with pure bitarithmetic operations, optimized for aperture 7 hexagon grids. Each parent cell contains exactly 7 children in the hierarchy.

### Compatibility

::: warning Aperture Restriction
Z7 is **only available** for aperture 7 hexagon grids.
:::

### API

```typescript
// Convert SEQNUM to Z7
const z7 = dggs.sequenceNumToZ7(seqnum, resolution);

// Convert Z7 to SEQNUM
const seqnum = dggs.z7ToSequenceNum(z7, resolution);
```

### Example

```typescript
import { Webdggrid, Topology } from 'webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: 'ISEA',
  aperture: 7,  // Must be aperture 7
}, 5);

const seqnum = 100n;
const z7 = dggs.sequenceNumToZ7(seqnum, 5);
console.log(z7); // 1153167795211468799n
console.log(z7.toString(16)); // Hex: 1000000000000fff

const backToSeqnum = dggs.z7ToSequenceNum(z7, 5);
console.log(backToSeqnum); // 100n
```

### Use Cases

- **Hierarchical indexing**: Efficient parent-child relationships for aperture 7 grids
- **High-resolution grids**: Aperture 7 creates finer subdivisions than aperture 3 or 4
- **Bitwise operations**: Z7 values support efficient bitwise manipulation

### Error Handling

```typescript
// This will throw an error for aperture 3 or 4
dggs.setDggs({
  // ... other params
  aperture: 3,  // ❌ Not supported
}, 5);

try {
  const z7 = dggs.sequenceNumToZ7(100n, 5);
} catch (error) {
  console.error(error.message);
  // "Z7 is only available for aperture 7 hexagon grids.
  //  Current configuration: aperture 3, topology HEXAGON."
}
```

## Choosing an Address Type

Use this guide to select the right address type for your use case:

### When to Use VERTEX2DD

- Low-level geometric operations
- Working with icosahedral geometry directly
- Debugging or visualization tools
- Cross-aperture compatibility needed

### When to Use ZORDER

- Spatial range queries
- Database indexing for spatial data
- Efficient nearest-neighbor searches
- Using aperture 3 or 4 grids

### When to Use Z3

- Working exclusively with aperture 3 hexagon grids
- Hierarchical parent-child operations
- Base-3 arithmetic on grid coordinates
- Optimized aperture 3 indexing

### When to Use Z7

- Working exclusively with aperture 7 hexagon grids
- Hierarchical parent-child operations
- High-resolution grid applications
- Bitwise coordinate manipulation

## Performance Considerations

All hierarchical address conversions are implemented in C++ and compiled to WebAssembly for maximum performance. Conversions are cached internally to avoid redundant calculations.

### Conversion Performance

- **VERTEX2DD**: Very fast, base coordinate system
- **ZORDER**: Fast, digit-interleaving operations
- **Z3**: Fast, base-3 encoding
- **Z7**: Fast, bitwise base-7 encoding

### Memory Usage

All hierarchical indices use `BigInt` (64-bit unsigned integer) except VERTEX2DD, which returns a JavaScript object with 5 fields.

## Integration Example

Here's a complete example using multiple address types together:

```typescript
import { Webdggrid, Topology } from 'webdggrid';

const dggs = await Webdggrid.load();

// Aperture 3: Can use VERTEX2DD, ZORDER, and Z3
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: 'ISEA',
  aperture: 3,
}, 5);

const seqnum = 50n;

// Get all available representations
const vertex = dggs.sequenceNumToVertex2DD(seqnum, 5);
const zorder = dggs.sequenceNumToZOrder(seqnum, 5);
const z3 = dggs.sequenceNumToZ3(seqnum, 5);

console.log('Cell representations:');
console.log('  SEQNUM:', seqnum);
console.log('  VERTEX2DD:', vertex);
console.log('  ZORDER:', zorder);
console.log('  Z3:', z3);

// Verify all convert back to the original SEQNUM
console.log('Round-trip verification:');
console.log('  VERTEX2DD →', dggs.vertex2DDToSequenceNum(
  vertex.keep, vertex.vertNum, vertex.triNum, vertex.x, vertex.y, 5
)); // 50n
console.log('  ZORDER →', dggs.zOrderToSequenceNum(zorder, 5)); // 50n
console.log('  Z3 →', dggs.z3ToSequenceNum(z3, 5)); // 50n

// Work with parent-child hierarchy
const parent = dggs.sequenceNumParent([seqnum], 5)[0];
const children = dggs.sequenceNumChildren([parent], 4);

console.log(`\nParent of ${seqnum} at resolution 4: ${parent}`);
console.log(`Children of ${parent}:`, children[0]);

// Convert parent and children to Z3
const parentZ3 = dggs.sequenceNumToZ3(parent, 4);
const childrenZ3 = children[0].map(c => dggs.sequenceNumToZ3(c, 5));

console.log(`Parent Z3: ${parentZ3}`);
console.log(`Children Z3:`, childrenZ3);
```

## API Reference

For complete API documentation, see:

- [`sequenceNumToVertex2DD()`](api/classes/Webdggrid.md#sequencenumtovertex2dd)
- [`vertex2DDToSequenceNum()`](api/classes/Webdggrid.md#vertex2ddtosequencenum)
- [`sequenceNumToZOrder()`](api/classes/Webdggrid.md#sequencenumtozorder)
- [`zOrderToSequenceNum()`](api/classes/Webdggrid.md#zordertosequencenum)
- [`sequenceNumToZ3()`](api/classes/Webdggrid.md#sequencenumtoz3)
- [`z3ToSequenceNum()`](api/classes/Webdggrid.md#z3tosequencenum)
- [`sequenceNumToZ7()`](api/classes/Webdggrid.md#sequencenumtoz7)
- [`z7ToSequenceNum()`](api/classes/Webdggrid.md#z7tosequencenum)

## Technical Details

### DGGRID Implementation

These address types are provided by DGGRID v8.44's reference frame system:

- `DgVertex2DDRF`: Always available for all apertures
- `DgZOrderRF`: Available for aperture 3 and 4 (null for aperture 7)
- `DgZ3RF`: Available for aperture 3 hexagons only
- `DgZ7RF`: Available for aperture 7 hexagons only

### Coordinate Formats

- **VERTEX2DD**: JavaScript object with boolean, integers, and floating-point coordinates
- **ZORDER, Z3, Z7**: 64-bit unsigned integers (JavaScript `BigInt`)

### Error Handling

All conversion methods validate aperture compatibility before calling WASM functions. Descriptive error messages indicate:

- The address type being used
- The required aperture(s)
- The current DGGS configuration
- Suggested alternatives

Example error message:
```
Z3 is only available for aperture 3 hexagon grids.
Current configuration: aperture 4, topology HEXAGON.
```
