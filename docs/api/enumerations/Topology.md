[webdggrid](../index.md) / Topology

# Enumeration: Topology

The shape of each cell in the Discrete Global Grid System.

DGGRID supports four cell topologies. The most common choice for geospatial
analysis is `HEXAGON` because hexagonal cells have equal adjacency (every
neighbour shares an edge), uniform area, and minimal boundary-to-area ratio.

## Export

## Example

```ts
import { Topology } from 'webdggrid';

dggs.setDggs({ topology: Topology.HEXAGON, ... }, 4);
```

## Enumeration Members

### DIAMOND

> **DIAMOND**: `"DIAMOND"`

Four-sided diamond cells (squares rotated 45°).

#### Source

[src-ts/webdggrid.ts:30](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L30)

***

### HEXAGON

> **HEXAGON**: `"HEXAGON"`

Six-sided cells — the default and most widely used topology.

#### Source

[src-ts/webdggrid.ts:24](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L24)

***

### SQUARE

> **SQUARE**: `"SQUARE"`

Four-sided square cells.

#### Source

[src-ts/webdggrid.ts:28](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L28)

***

### TRIANGLE

> **TRIANGLE**: `"TRIANGLE"`

Three-sided cells.

#### Source

[src-ts/webdggrid.ts:26](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L26)
