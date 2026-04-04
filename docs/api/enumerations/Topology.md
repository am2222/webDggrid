[webdggrid](../globals.md) / Topology

# Enumeration: Topology

Defined in: [webdggrid.ts:22](https://github.com/am2222/webDggrid/blob/a6b8cd4012debbc498d65ca4dc0d8036b6cb60cc/src-ts/webdggrid.ts#L22)

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

Defined in: [webdggrid.ts:28](https://github.com/am2222/webDggrid/blob/a6b8cd4012debbc498d65ca4dc0d8036b6cb60cc/src-ts/webdggrid.ts#L28)

Four-sided diamond cells (squares rotated 45°).

***

### HEXAGON

> **HEXAGON**: `"HEXAGON"`

Defined in: [webdggrid.ts:24](https://github.com/am2222/webDggrid/blob/a6b8cd4012debbc498d65ca4dc0d8036b6cb60cc/src-ts/webdggrid.ts#L24)

Six-sided cells — the default and most widely used topology.

***

### TRIANGLE

> **TRIANGLE**: `"TRIANGLE"`

Defined in: [webdggrid.ts:26](https://github.com/am2222/webDggrid/blob/a6b8cd4012debbc498d65ca4dc0d8036b6cb60cc/src-ts/webdggrid.ts#L26)

Three-sided cells.
