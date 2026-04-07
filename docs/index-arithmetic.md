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

Z3, Z7, and ZORDER use **fixed bit-position encoding** within a 64-bit integer — NOT simple positional radix numbers. Understanding this layout is essential for correct bit manipulation.

```
64-bit layout:
┌──────┬────────┬────────┬────────┬─────┬────────┐
│ Quad │ Res 1  │ Res 2  │ Res 3  │ ... │ Res N  │
│4 bits│ B bits │ B bits │ B bits │     │ B bits │
└──────┴────────┴────────┴────────┴─────┴────────┘

Z3:     B = 2 bits per digit, max 30 levels, invalid marker = 3
Z7:     B = 3 bits per digit, max 20 levels, invalid marker = 7
ZORDER: B = 2 bits per digit, max 30 levels
```

The **quad** (bits 63–60) identifies which icosahedron face the cell belongs to. Each resolution digit occupies a fixed bit position — unused slots are filled with the invalid marker.

::: warning
Simple division (`z3 / 3n`) and multiplication (`z3 * 3n + digit`) will NOT work — they shift all bits and corrupt the fixed-position layout. Use the built-in digit manipulation methods instead.
:::

## API Methods

WebDGGRID provides built-in methods for all digit operations — no helper functions needed:

| Index Type | Get Quad | Get Digit | Set Digit | Extract All |
|-----------|----------|-----------|-----------|-------------|
| **Z7** | `z7GetQuad(z7)` | `z7GetDigit(z7, res)` | `z7SetDigit(z7, res, digit)` | `z7ExtractDigits(z7, res)` |
| **Z3** | `z3GetQuad(z3)` | `z3GetDigit(z3, res)` | `z3SetDigit(z3, res, digit)` | `z3ExtractDigits(z3, res)` |
| **ZORDER** | `zOrderGetQuad(z)` | `zOrderGetDigit(z, res)` | `zOrderSetDigit(z, res, digit)` | `zOrderExtractDigits(z, res)` |

These match DGGRID's internal C++ macros (`Z7_GET_INDEX_DIGIT`, etc.) and are pure bitwise operations — no WASM calls needed.

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

### Extract Digit at a Resolution

```typescript
const digit = dggs.z3GetDigit(z3, 5);
console.log(digit); // 0, 1, or 2 — the child index at resolution 5
```

### Walk the Hierarchy

Extract the full hierarchical path from coarsest to finest:

```typescript
const { quad, digits } = dggs.z3ExtractDigits(z3, 5);
console.log(`Quad ${quad}, path: [${digits}]`);
// e.g. "Quad 1, path: [1, 0, 2, 1, 0]"
```

### Modify a Digit

Change the digit at a specific resolution to navigate to a sibling cell:

```typescript
const origDigit = dggs.z3GetDigit(z3, 5);
const newDigit = (origDigit + 1) % 3;
const siblingZ3 = dggs.z3SetDigit(z3, 5, newDigit);
const siblingSeq = dggs.z3ToSequenceNum(siblingZ3, 5);
console.log(siblingSeq); // a different cell that shares the same parent
```

### Check if Cell is Ancestor

Two cells share an ancestor if they have the same quad and matching digits up to the ancestor's resolution:

```typescript
function isAncestor(dggs, ancestorZ3: bigint, descendantZ3: bigint, resAncestor: number): boolean {
  if (dggs.z3GetQuad(ancestorZ3) !== dggs.z3GetQuad(descendantZ3)) return false;
  for (let r = 1; r <= resAncestor; r++) {
    if (dggs.z3GetDigit(ancestorZ3, r) !== dggs.z3GetDigit(descendantZ3, r)) {
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

### Extract Digits

```typescript
const { quad, digits } = dggs.z7ExtractDigits(z7, 5);
console.log(`Quad ${quad}, path: [${digits}]`);
// e.g. "Quad 1, path: [2, 0, 3, 4, 1]"
```

### Modify a Digit

```typescript
const origDigit = dggs.z7GetDigit(z7, 5);
const newDigit = (origDigit + 1) % 7;
const siblingZ7 = dggs.z7SetDigit(z7, 5, newDigit);
const siblingSeq = dggs.z7ToSequenceNum(siblingZ7, 5);
```

### Sibling Enumeration

Find all cells that share the same parent by varying the last digit:

```typescript
const siblings = [0, 1, 2, 3, 4, 5, 6].map(digit => {
  const sibZ7 = dggs.z7SetDigit(z7, 5, digit);
  return dggs.z7ToSequenceNum(sibZ7, 5);
});
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

**Z3/Z7** use fixed bit-position encoding. Each digit occupies a predetermined bit slot within a 64-bit integer (2 bits for Z3, 3 bits for Z7), with a 4-bit quad header. Use `z3GetDigit()` / `z3SetDigit()` (and Z7/ZORDER equivalents) to navigate the hierarchy. Simple division/multiplication will NOT work.

**ZORDER** uses the same bit layout (2 bits/digit, 4-bit quad) but for spatial indexing. Use `zOrderGetDigit()` / `zOrderSetDigit()` for digit-level manipulation, and numerical proximity for range queries.

All digit methods are pure BigInt bitwise operations — no WASM calls, no latency.

## API Reference

- [`sequenceNumToZ3()`](api/classes/Webdggrid.md#sequencenumtoz3) / [`z3ToSequenceNum()`](api/classes/Webdggrid.md#z3tosequencenum)
- [`sequenceNumToZ7()`](api/classes/Webdggrid.md#sequencenumtoz7) / [`z7ToSequenceNum()`](api/classes/Webdggrid.md#z7tosequencenum)
- [`sequenceNumToZOrder()`](api/classes/Webdggrid.md#sequencenumtozorder) / [`zOrderToSequenceNum()`](api/classes/Webdggrid.md#zordertosequencenum)
