[webdggrid](../index.md) / Projection

# Enumeration: Projection

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

Fuller/Dymaxion projection — shape-preserving cells.

#### Source

[src-ts/webdggrid.ts:55](https://github.com/am2222/webDggrid/blob/5796c44/src-ts/webdggrid.ts#L55)

***

### ISEA

> **ISEA**: `"ISEA"`

Icosahedral Snyder Equal Area projection — equal-area cells.

#### Source

[src-ts/webdggrid.ts:53](https://github.com/am2222/webDggrid/blob/5796c44/src-ts/webdggrid.ts#L53)
