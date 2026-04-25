# IGEO7 / Z7 Hexagonal Hierarchical Index

WebDGGRID embeds the upstream [Z7 C++ core library](https://github.com/allixender/igeo7_duckdb)
and surfaces every `igeo7_*` scalar function from the DuckDB extension as a
JavaScript method on `Webdggrid`.

The IGEO7 index is a **64-bit packed integer** that uniquely identifies a cell
in a hexagonal aperture-7 discrete global grid up to resolution 20. All
operations are pure bit-level manipulations — they run in nanoseconds and do
**not** require a DGGS configuration. You can call them immediately after
`Webdggrid.load()`.

## Index format

```
bits [63:60]  base cell  (4 bits, values 0-11)
bits [59:57]  digit  1   (3 bits, values 0-6; 7 = padding / unused slot)
bits [56:54]  digit  2
...
bits  [2: 0]  digit 20
```

The **compact string** form (`igeo7ToString`) is a 2-digit zero-padded base
cell followed by digit characters, stopping before the first padding digit
(`7`):

```
0800432  →  base 08, digits 0,0,4,3,2, resolution 5
```

Invalid or excluded cells are represented by the sentinel
`0xFFFFFFFFFFFFFFFFn` (`UINT64_MAX`). Use `igeo7IsValid` to filter them.

## Interactive demo

Type a Z7 string to see its decomposition, parent chain, and 6 neighbours.
Click `→ inspect` on any related cell to drill into it.

<ClientOnly>
  <Igeo7Demo />
</ClientOnly>

## API

| Method | Signature | Description |
|--------|-----------|-------------|
| `igeo7FromString` | `(s: string) → bigint` | Parse compact Z7 string to packed index |
| `igeo7ToString` | `(index: bigint) → string` | Render packed index as compact string |
| `igeo7Encode` | `(base: number, digits: number[20]) → bigint` | Pack base cell + 20 digit slots |
| `igeo7GetResolution` | `(index: bigint) → number` | Resolution (0-20) of the index |
| `igeo7GetBaseCell` | `(index: bigint) → number` | Base cell ID (0-11) |
| `igeo7GetDigit` | `(index: bigint, position: number) → number` | Extract the i-th digit (1-20) |
| `igeo7Parent` | `(index: bigint) → bigint` | Parent index (one level up) |
| `igeo7ParentAt` | `(index: bigint, resolution: number) → bigint` | Ancestor at a specific resolution |
| `igeo7Neighbours` | `(index: bigint) → bigint[6]` | All 6 neighbours (pentagon-excluded = `UINT64_MAX`) |
| `igeo7Neighbour` | `(index: bigint, direction: number) → bigint` | Single neighbour by direction (1-6) |
| `igeo7FirstNonZero` | `(index: bigint) → number` | Position of first non-zero digit slot |
| `igeo7IsValid` | `(index: bigint) → boolean` | `false` when index equals the invalid sentinel |

## Examples

### Round-trip between string and packed index

```typescript
import { Webdggrid } from 'webdggrid';

const dggs = await Webdggrid.load();

const idx = dggs.igeo7FromString('0800432');
// 9241389823593963519n

dggs.igeo7ToString(idx);
// '0800432'

dggs.igeo7GetResolution(idx); // 5
dggs.igeo7GetBaseCell(idx);   // 8
```

### Encode a cell from its components

`igeo7Encode` is the inverse of `igeo7GetBaseCell` + `igeo7GetDigit`. Use `7`
for every padding slot beyond the target resolution.

```typescript
// Reconstruct '0800432' — base=8, resolution=5
const cell = dggs.igeo7Encode(8, [
    0, 0, 4, 3, 2,
    7, 7, 7, 7, 7,
    7, 7, 7, 7, 7,
    7, 7, 7, 7, 7,
]);

cell === dggs.igeo7FromString('0800432'); // true
```

### Extract individual digits

```typescript
const idx = dggs.igeo7FromString('0800432');

dggs.igeo7GetDigit(idx, 1); // 0
dggs.igeo7GetDigit(idx, 2); // 0
dggs.igeo7GetDigit(idx, 3); // 4
dggs.igeo7GetDigit(idx, 4); // 3
dggs.igeo7GetDigit(idx, 5); // 2
dggs.igeo7GetDigit(idx, 6); // 7  (padding — beyond resolution)
```

### Walk up the hierarchy

```typescript
let cell = dggs.igeo7FromString('0800432');

while (dggs.igeo7GetResolution(cell) > 0) {
    console.log(dggs.igeo7ToString(cell));
    cell = dggs.igeo7Parent(cell);
}
// 0800432, 080043, 08004, 0800, 080, 08
```

Or jump directly to a given ancestor resolution:

```typescript
const cell = dggs.igeo7FromString('0800432');
dggs.igeo7ToString(dggs.igeo7ParentAt(cell, 3)); // '08004'
```

### Neighbours

```typescript
const cell = dggs.igeo7FromString('0800432');

// All 6 neighbours (GBT directions 1-6)
const ns = dggs.igeo7Neighbours(cell)
    .filter(n => dggs.igeo7IsValid(n))
    .map(n => dggs.igeo7ToString(n));

// Single neighbour by direction
dggs.igeo7ToString(dggs.igeo7Neighbour(cell, 1));
```

Pentagons (the 12 special base cells at resolution 0) have one excluded
direction, returned as the invalid sentinel:

```typescript
const pent = dggs.igeo7FromString('0800'); // a pentagon at res 2
const ns = dggs.igeo7Neighbours(pent);
ns.filter(n => !dggs.igeo7IsValid(n)).length; // exactly 1
```

## Relationship to DGGRID's built-in Z7

DGGRID ships its own Z7 implementation accessible via `sequenceNumToZ7` /
`z7ToSequenceNum` — those methods convert between DGGRID sequence numbers and
Z7 indices for the **currently configured** DGGS at a specific resolution.

The `igeo7*` methods on this page are a **stateless, standalone** surface on
top of the upstream Z7 core library. They are useful when you have Z7 indices
from another system (e.g. a DuckDB column produced by the `igeo7_*` SQL
extension) and want to inspect or manipulate them without first setting a
DGGS configuration.

## Source

- Upstream: [allixender/igeo7_duckdb](https://github.com/allixender/igeo7_duckdb)
- Vendored at: `submodules/igeo7_duckdb/src/z7/`
- WASM bindings: `src-cpp/igeo7_bindings.cpp`
