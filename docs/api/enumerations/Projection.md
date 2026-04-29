[webdggrid](../globals.md) / Projection

# Enumeration: Projection

Defined in: [webdggrid.ts:49](https://github.com/am2222/webDggrid/blob/46d3220e4b260396a281ac7fc8c31a562326bb54/src-ts/webdggrid.ts#L49)

The map projection used to place the polyhedron faces onto the sphere.

- **ISEA** (Icosahedral Snyder Equal Area) — preserves cell area at the cost
  of shape distortion. Recommended for most analytical use-cases.
- **FULLER** (Fuller/Dymaxion) — minimises shape distortion but does not
  preserve equal area.

## Export

## Example

```ts
import { Projection } from 'webdggrid';

dggs.setDggs({ projection: Projection.ISEA, ... }, 4);
```

## Enumeration Members

### FULLER

> **FULLER**: `"FULLER"`

Defined in: [webdggrid.ts:53](https://github.com/am2222/webDggrid/blob/46d3220e4b260396a281ac7fc8c31a562326bb54/src-ts/webdggrid.ts#L53)

Fuller/Dymaxion projection — shape-preserving cells.

***

### ISEA

> **ISEA**: `"ISEA"`

Defined in: [webdggrid.ts:51](https://github.com/am2222/webDggrid/blob/46d3220e4b260396a281ac7fc8c31a562326bb54/src-ts/webdggrid.ts#L51)

Icosahedral Snyder Equal Area projection — equal-area cells.
