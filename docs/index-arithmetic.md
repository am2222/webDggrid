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

## Z3 Arithmetic (Aperture 3)

Z3 encodes each cell as a base-3 number where each digit (0, 1, 2) represents which of the 3 children was chosen at that resolution level.

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

### Find Parent — Integer Division

Drop the last base-3 digit by dividing by 3. This is equivalent to `sequenceNumParent()`.

```typescript
const parentZ3 = z3 / 3n;
const parentSeq = dggs.z3ToSequenceNum(parentZ3, 4);

// Verify: identical to the API
const parentApi = dggs.sequenceNumParent([cellId], 5)[0];
console.log(parentSeq === parentApi); // true
```

### Find Children — Multiply and Append

Multiply by 3 and add digits 0, 1, 2. This is equivalent to `sequenceNumChildren()`.

```typescript
const children = [0n, 1n, 2n].map(digit => {
  const childZ3 = z3 * 3n + digit;
  return dggs.z3ToSequenceNum(childZ3, 6);
});

// Verify: identical to the API
const childrenApi = dggs.sequenceNumChildren([cellId], 5)[0];
console.log(children.every((c, i) => c === childrenApi[i])); // true
```

### Extract Resolution Level — Modulo

Read which child was chosen at the finest level:

```typescript
const lastDigit = z3 % 3n;
console.log(lastDigit); // 0n, 1n, or 2n — the child index at this resolution
```

### Walk the Hierarchy — Digit Extraction

Extract the full hierarchical path from coarsest to finest:

```typescript
function extractDigits(z3Value, resolution) {
  const digits = [];
  let v = z3Value;
  for (let i = 0; i < resolution; i++) {
    digits.unshift(Number(v % 3n));
    v = v / 3n;
  }
  return digits;
}

const path = extractDigits(z3, 5);
console.log(path); // e.g. [1, 0, 2, 1, 0] — the path from root to cell
```

### Check if Cell is Ancestor

Cell A is an ancestor of cell B if B's Z3 value starts with A's digits:

```typescript
function isAncestor(ancestorZ3, descendantZ3, resAncestor, resDescendant) {
  const shift = BigInt(resDescendant - resAncestor);
  const base = 3n;
  return descendantZ3 / (base ** shift) === ancestorZ3;
}
```

## Z7 Arithmetic (Aperture 7)

Z7 works identically to Z3 but in base 7. Each parent has exactly 7 children (digits 0–6).

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
const parentZ7 = z7 / 7n;
const parentSeq = dggs.z7ToSequenceNum(parentZ7, 4);
```

### Find Children

```typescript
const children = [0n, 1n, 2n, 3n, 4n, 5n, 6n].map(digit => {
  const childZ7 = z7 * 7n + digit;
  return dggs.z7ToSequenceNum(childZ7, 6);
});
```

### Extract Digits

```typescript
function extractZ7Digits(z7Value, resolution) {
  const digits = [];
  let v = z7Value;
  for (let i = 0; i < resolution; i++) {
    digits.unshift(Number(v % 7n));
    v = v / 7n;
  }
  return digits;
}

const path = extractZ7Digits(z7, 5);
// e.g. [3, 1, 5, 0, 2] — 7-ary hierarchical path
```

### Sibling Enumeration

Find all cells that share the same parent (siblings):

```typescript
const parentZ7 = z7 / 7n;
const siblings = [0n, 1n, 2n, 3n, 4n, 5n, 6n].map(digit => {
  return dggs.z7ToSequenceNum(parentZ7 * 7n + digit, 5);
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
| Find parent | `z / base` | N/A | `sequenceNumParent()` |
| Find children | `z * base + digit` | N/A | `sequenceNumChildren()` |
| Check ancestry | `descendant / base^n === ancestor` | Prefix comparison | N/A |
| Range query | N/A | `BETWEEN zMin AND zMax` | N/A |
| Spatial proximity | Compare digit prefixes | Compare values | N/A |
| Database index | Good for hierarchy | Good for spatial | Just an ID |
| Sibling enumeration | Vary last digit | N/A | Via parent + children |

## Key Takeaway

**SEQNUM** is just a flat ID — arithmetic on it is meaningless.

**Z3/Z7** encode the hierarchical path, so division and multiplication navigate up and down the tree.

**ZORDER** encodes spatial position, so numerical proximity equals spatial proximity — perfect for range queries and database indexing.

All operations are plain BigInt math. The API's `sequenceNumToZ3()` / `z3ToSequenceNum()` (and Z7/ZORDER equivalents) are the only bridge you need.

## API Reference

- [`sequenceNumToZ3()`](api/classes/Webdggrid.md#sequencenumtoz3) / [`z3ToSequenceNum()`](api/classes/Webdggrid.md#z3tosequencenum)
- [`sequenceNumToZ7()`](api/classes/Webdggrid.md#sequencenumtoz7) / [`z7ToSequenceNum()`](api/classes/Webdggrid.md#z7tosequencenum)
- [`sequenceNumToZOrder()`](api/classes/Webdggrid.md#sequencenumtozorder) / [`zOrderToSequenceNum()`](api/classes/Webdggrid.md#zordertosequencenum)
