# Coordinate Transformation API

WebDggrid exposes all DGGRID coordinate systems through a comprehensive transformation API.

## Coordinate Systems

### GEO (Geographic)
- **Format**: `[longitude, latitude]` in decimal degrees
- **Usage**: Standard lat/lon coordinates (WGS-84)
- **Example**: `[0, 0]` for the equator at prime meridian

### SEQNUM (Sequence Number)
- **Format**: `BigInt` cell ID
- **Usage**: Unique identifier for each cell at a given resolution
- **Example**: `1n` for the first cell

### Q2DI (Quad 2D Integer)
- **Format**: `{quad: number, i: bigint, j: bigint}`
- **Usage**: Integer grid coordinates on icosahedron quad faces
- **Example**: `{quad: 0, i: 0n, j: 0n}`

### Q2DD (Quad 2D Double)
- **Format**: `{quad: number, x: number, y: number}`
- **Usage**: Floating-point grid coordinates on icosahedron quad faces
- **Example**: `{quad: 0, x: 0.5, y: 0.5}`

### PROJTRI (Projection Triangle)
- **Format**: `{tnum: number, x: number, y: number}`
- **Usage**: Coordinates in projection triangle space
- **Example**: `{tnum: 0, x: 0.5, y: 0.5}`

### PLANE (Planar)
- **Format**: `{x: number, y: number}`
- **Usage**: Flat 2D coordinates (output only - no PLANE_to_* transformations)
- **Example**: `{x: 1000.0, y: 2000.0}`

## High-Level API

For most use cases, use the high-level methods:

```typescript
import { Webdggrid } from 'webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs({ /* config */ }, 5);

// Geographic ↔ Sequence Number
const cellIds = dggs.geoToSequenceNum([[0, 0], [10, 20]], 5);
const coords = dggs.sequenceNumToGeo(cellIds, 5);
```

## Low-Level Transformation API

For advanced use cases requiring direct access to coordinate systems:

### FROM GEO

```typescript
const coords = [[0, 0], [10, 20]];

// GEO → other systems
const plane = dggs.geoToPlane(coords, 5);
// [{x: 100.5, y: 200.3}, ...]

const projtri = dggs.geoToProjtri(coords, 5);
// [{tnum: 0, x: 0.5, y: 0.3}, ...]

const q2dd = dggs.geoToQ2dd(coords, 5);
// [{quad: 0, x: 0.5, y: 0.3}, ...]

const q2di = dggs.geoToQ2di(coords, 5);
// [{quad: 0, i: 10n, j: 20n}, ...]
```

### FROM SEQNUM

```typescript
const cellIds = [1n, 100n, 500n];

// SEQNUM → other systems
const plane = dggs.sequenceNumToPlane(cellIds, 5);
const projtri = dggs.sequenceNumToProjtri(cellIds, 5);
const q2dd = dggs.sequenceNumToQ2dd(cellIds, 5);
const q2di = dggs.sequenceNumToQ2di(cellIds, 5);
```

### FROM Q2DI

```typescript
const q2di = [
    {quad: 0, i: 0n, j: 0n},
    {quad: 1, i: 5n, j: 3n}
];

// Q2DI → other systems
const geo = dggs.q2diToGeo(q2di, 5);
// [[0, 0], [10.5, 20.3]]

const seqnum = dggs.q2diToSequenceNum(q2di, 5);
// [1n, 234n]

const plane = dggs.q2diToPlane(q2di, 5);
const projtri = dggs.q2diToProjtri(q2di, 5);
const q2dd = dggs.q2diToQ2dd(q2di, 5);
```

### FROM Q2DD

```typescript
const q2dd = [
    {quad: 0, x: 0.5, y: 0.5},
    {quad: 1, x: 0.3, y: 0.7}
];

// Q2DD → other systems
const geo = dggs.q2ddToGeo(q2dd, 5);
const seqnum = dggs.q2ddToSequenceNum(q2dd, 5);
const plane = dggs.q2ddToPlane(q2dd, 5);
const projtri = dggs.q2ddToProjtri(q2dd, 5);
const q2di = dggs.q2ddToQ2di(q2dd, 5);
```

### FROM PROJTRI

```typescript
const projtri = [
    {tnum: 0, x: 0.5, y: 0.5},
    {tnum: 1, x: 0.3, y: 0.7}
];

// PROJTRI → other systems
const geo = dggs.projtriToGeo(projtri, 5);
const seqnum = dggs.projtriToSequenceNum(projtri, 5);
const plane = dggs.projtriToPlane(projtri, 5);
const q2dd = dggs.projtriToQ2dd(projtri, 5);
const q2di = dggs.projtriToQ2di(projtri, 5);
```

## Common Workflows

### Q2DI to GeoJSON Geometry

```typescript
// Start with Q2DI coordinates (e.g., from external data)
const q2di = [
    {quad: 0, i: 0n, j: 0n},
    {quad: 0, i: 5n, j: 3n}
];

// Convert to sequence numbers
const seqnums = dggs.q2diToSequenceNum(q2di, 5);

// Generate GeoJSON polygons
const geojson = dggs.sequenceNumToGridFeatureCollection(seqnums, 5);

// Ready for mapping libraries
map.addSource('grid', { type: 'geojson', data: geojson });
```

### Round-Trip Validation

```typescript
// Original coordinates
const original = [[0, 0], [10, 20]];

// GEO → Q2DI → GEO
const q2di = dggs.geoToQ2di(original, 5);
const roundtrip = dggs.q2diToGeo(q2di, 5);

// Should be close (within cell resolution)
console.log('Original:', original);
console.log('Round-trip:', roundtrip);
```

### Multi-System Conversions

```typescript
// Convert through multiple systems
const geo = [[0, 0]];
const seqnum = dggs.geoToSequenceNum(geo, 5);
const q2di = dggs.sequenceNumToQ2di(seqnum, 5);
const q2dd = dggs.q2diToQ2dd(q2di, 5);
const projtri = dggs.q2ddToProjtri(q2dd, 5);

console.log('GEO:', geo);
console.log('SEQNUM:', seqnum);
console.log('Q2DI:', q2di);
console.log('Q2DD:', q2dd);
console.log('PROJTRI:', projtri);
```

## Transformation Matrix

All possible transformations:

|  | GEO | SEQNUM | Q2DI | Q2DD | PROJTRI | PLANE |
|---|---|---|---|---|---|---|
| **FROM GEO** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **FROM SEQNUM** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **FROM Q2DI** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **FROM Q2DD** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **FROM PROJTRI** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **FROM PLANE** | ✗ | ✗ | ✗ | ✗ | ✗ | — |

> **Note**: PLANE is an output-only coordinate system. No `PLANE_to_*` transformations are available in DGGRID.

## See Also

- [API Reference - Webdggrid class](api/classes/Webdggrid.md)
- [examples/multi-aperture-example.mjs](../examples/multi-aperture-example.mjs)
- [tests/unit/coordinate-transforms.test.ts](../tests/unit/coordinate-transforms.test.ts)
