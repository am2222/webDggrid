# Index Arithmetic

One of the most powerful features of hierarchical index types (Z3, Z7, ZORDER) is that **standard arithmetic and bitwise operations on the raw index values correspond to spatial and hierarchical operations on the grid**. No special API methods are needed — just plain BigInt math.

This page shows practical recipes for each index type.

## Interactive Demo

Try changing the aperture to see different index types in action. Click a cell, then inspect the arithmetic panel below.

<ClientOnly>
  <DggsAddressTypesDemo />
</ClientOnly>

## Setup

All examples below assume this setup:

```typescript
import { Webdggrid } from 'webdggrid';

const dggs = await Webdggrid.load();
```

## Bit Layout

Z3 and Z7 use **fixed bit-position encoding** within a 64-bit integer — NOT simple positional radix numbers. Understanding this layout is essential for correct bit manipulation.

```
64-bit layout:
┌──────┬────────┬────────┬────────┬─────┬────────┐
│ Quad │ Res 1  │ Res 2  │ Res 3  │ ... │ Res N  │
│4 bits│ B bits │ B bits │ B bits │     │ B bits │
└──────┴────────┴────────┴────────┴─────┴────────┘

Z3: B = 2 bits per digit, max 30 resolution levels, invalid marker = 3
Z7: B = 3 bits per digit, max 20 resolution levels, invalid marker = 7
```

The **quad** (bits 63–60) identifies which icosahedron face the cell belongs to. Each resolution digit occupies a fixed bit position — unused slots are filled with the invalid marker.

::: warning
Simple division (`z3 / 3n`) and multiplication (`z3 * 3n + digit`) will NOT work — they shift all bits and corrupt the fixed-position layout. Use bitwise operations instead.
:::

## Helper Functions

These utility functions work for both Z3 and Z7:

```typescript
const Z3_BITS = 2n, Z3_MAX = 30, Z3_INVALID = 3n;
const Z7_BITS = 3n, Z7_MAX = 20, Z7_INVALID = 7n;

// Read the digit at a given resolution level
function getDigit(value: bigint, res: number, bitsPerDigit: bigint, maxRes: number): number {
  const shift = BigInt(maxRes - res) * bitsPerDigit;
  const mask = (1n << bitsPerDigit) - 1n;
  return Number((value >> shift) & mask);
}

// Write a digit at a given resolution level
function setDigit(value: bigint, res: number, digit: number, bitsPerDigit: bigint, maxRes: number): bigint {
  const shift = BigInt(maxRes - res) * bitsPerDigit;
  const mask = (1n << bitsPerDigit) - 1n;
  return (value & ~(mask << shift)) | (BigInt(digit) << shift);
}

// Read the quad (icosahedron face)
function getQuad(value: bigint): number {
  return Number((value >> 60n) & 0xFn);
}
```

## Z3 Arithmetic (Aperture 3)

Z3 encodes each cell with a 4-bit quad header and 2-bit digits at fixed positions (one per resolution level, max 30).

```typescript
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  aperture: 3,
  topology: 'HEXAGON',
  projection: 'ISEA',
}, 5);

const cellId = 50n;
const z3 = dggs.sequenceNumToZ3(cellId, 5);
```

### Find Parent — Clear Last Digit

Set the digit at the current resolution to the invalid marker (3):

```typescript
// Parent = clear digit at resolution 5 (set to invalid marker 3)
const parentZ3 = setDigit(z3, 5, 3, Z3_BITS, Z3_MAX);
const parentSeq = dggs.z3ToSequenceNum(parentZ3, 4);

// Verify: identical to the API
const parentApi = dggs.sequenceNumParent([cellId], 5)[0];
console.log(parentSeq === parentApi); // true
```

### Find Children — Write Next Digit

Write digits 0, 1, 2 at the next resolution position:

```typescript
const children = [0, 1, 2].map(digit => {
  const childZ3 = setDigit(z3, 6, digit, Z3_BITS, Z3_MAX);
  return dggs.z3ToSequenceNum(childZ3, 6);
});

// Verify: identical to the API
const childrenApi = dggs.sequenceNumChildren([cellId], 5)[0];
console.log(children.every((c, i) => c === childrenApi[i])); // true
```

### Extract Digit at a Resolution

```typescript
const digit = getDigit(z3, 5, Z3_BITS, Z3_MAX);
console.log(digit); // 0, 1, or 2 — the child index at resolution 5
```

### Walk the Hierarchy

Extract the full hierarchical path from coarsest to finest:

```typescript
const quad = getQuad(z3);
const path = [];
for (let r = 1; r <= 5; r++) {
  path.push(getDigit(z3, r, Z3_BITS, Z3_MAX));
}
console.log(`Quad ${quad}, path: [${path}]`);
// e.g. "Quad 1, path: [1, 0, 2, 1, 0]"
```

### Check if Cell is Ancestor

Two cells share an ancestor if they have the same quad and matching digits up to the ancestor's resolution:

```typescript
function isAncestor(ancestorZ3: bigint, descendantZ3: bigint, resAncestor: number): boolean {
  if (getQuad(ancestorZ3) !== getQuad(descendantZ3)) return false;
  for (let r = 1; r <= resAncestor; r++) {
    if (getDigit(ancestorZ3, r, Z3_BITS, Z3_MAX) !== getDigit(descendantZ3, r, Z3_BITS, Z3_MAX)) {
      return false;
    }
  }
  return true;
}
```

## Z7 Arithmetic (Aperture 7)

Z7 uses 3-bit digits (values 0–6) at fixed positions, with invalid marker 7. Max 20 resolution levels.

```typescript
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  aperture: 7,
  topology: 'HEXAGON',
  projection: 'ISEA',
}, 5);

const cellId = 100n;
const z7 = dggs.sequenceNumToZ7(cellId, 5);
```

### Find Parent

```typescript
const parentZ7 = setDigit(z7, 5, 7, Z7_BITS, Z7_MAX);  // set digit 5 to invalid (7)
const parentSeq = dggs.z7ToSequenceNum(parentZ7, 4);
```

### Find Children

```typescript
const children = [0, 1, 2, 3, 4, 5, 6].map(digit => {
  const childZ7 = setDigit(z7, 6, digit, Z7_BITS, Z7_MAX);
  return dggs.z7ToSequenceNum(childZ7, 6);
});
```

### Sibling Enumeration

Find all cells that share the same parent (siblings):

```typescript
const siblings = [0, 1, 2, 3, 4, 5, 6].map(digit => {
  const sibZ7 = setDigit(z7, 5, digit, Z7_BITS, Z7_MAX);
  return dggs.z7ToSequenceNum(sibZ7, 5);
});
// siblings contains all 7 children of the same parent, including the original cell
```

## ZORDER Arithmetic (Aperture 3 & 4)

ZORDER (Morton codes) interleave coordinate bits to create a Z-shaped space-filling curve. Unlike Z3/Z7, ZORDER doesn't directly encode parent-child relationships, but it provides **spatial locality** — cells that are close in space have close ZORDER values.

```typescript
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  aperture: 4,
  topology: 'HEXAGON',
  projection: 'ISEA',
}, 5);

const cellId = 100n;
const zorder = dggs.sequenceNumToZOrder(cellId, 5);
```

### Spatial Range Queries

Since spatially close cells have similar ZORDER values, you can do range queries:

```typescript
// Find all cells in a ZORDER range
function cellsInRange(zMin, zMax, resolution) {
  const cells = [];
  // In practice, you'd query a database with: WHERE zorder BETWEEN zMin AND zMax
  // This is much faster than checking geographic bounds for each cell
  return cells;
}
```

### Common Ancestor Detection

Two cells that share a longer ZORDER hex prefix are closer in the spatial hierarchy:

```typescript
function sharedPrefixLength(z1, z2) {
  const h1 = z1.toString(16).padStart(16, '0');
  const h2 = z2.toString(16).padStart(16, '0');
  let common = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] === h2[i]) common++;
    else break;
  }
  return common;
}

const neighborZorder = dggs.sequenceNumToZOrder(neighborId, 5);
const prefix = sharedPrefixLength(zorder, neighborZorder);
// Higher prefix length = closer spatial relationship
```

### Database Indexing Pattern

ZORDER is ideal for spatial indexing in databases:

```typescript
// Store cells with ZORDER index
const cells = cellIds.map(id => ({
  seqnum: id,
  zorder: dggs.sequenceNumToZOrder(id, 5),
  // ... other data
}));

// Query: "find all cells near this point"
const targetZorder = dggs.sequenceNumToZOrder(targetCell, 5);
// SQL: SELECT * FROM cells WHERE zorder BETWEEN ? AND ? ORDER BY zorder
// The range bounds can be computed from the target's ZORDER +/- a window
```

## Comparison: When to Use Which

| Operation | Z3/Z7 | ZORDER | SEQNUM |
|-----------|-------|--------|--------|
| Find parent | `setDigit(z, res, INVALID)` | N/A | `sequenceNumParent()` |
| Find children | `setDigit(z, res+1, digit)` | N/A | `sequenceNumChildren()` |
| Check ancestry | Compare digits 1..N | Hex prefix comparison | N/A |
| Range query | N/A | `BETWEEN zMin AND zMax` | N/A |
| Spatial proximity | Compare digit prefixes | Compare values | N/A |
| Database index | Good for hierarchy | Good for spatial | Just an ID |
| Sibling enumeration | Vary last digit | N/A | Via parent + children |

## Key Takeaway

**SEQNUM** is just a flat ID — arithmetic on it is meaningless.

**Z3/Z7** use fixed bit-position encoding. Each digit occupies a predetermined bit slot within a 64-bit integer (2 bits for Z3, 3 bits for Z7), with a 4-bit quad header. Navigate the hierarchy by reading/writing digits at specific bit positions using shift and mask operations. Simple division/multiplication will NOT work.

**ZORDER** encodes spatial position, so numerical proximity equals spatial proximity — perfect for range queries and database indexing.

The API's `sequenceNumToZ3()` / `z3ToSequenceNum()` (and Z7/ZORDER equivalents) convert between SEQNUM and these index types. The `getDigit()` / `setDigit()` helpers above are all you need for hierarchical navigation.

## API Reference

- [`sequenceNumToZ3()`](api/classes/Webdggrid.md#sequencenumtoz3) / [`z3ToSequenceNum()`](api/classes/Webdggrid.md#z3tosequencenum)
- [`sequenceNumToZ7()`](api/classes/Webdggrid.md#sequencenumtoz7) / [`z7ToSequenceNum()`](api/classes/Webdggrid.md#z7tosequencenum)
- [`sequenceNumToZOrder()`](api/classes/Webdggrid.md#sequencenumtozorder) / [`zOrderToSequenceNum()`](api/classes/Webdggrid.md#zordertosequencenum)
