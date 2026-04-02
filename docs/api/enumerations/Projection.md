[webdggrid](../globals.md) / Projection

# Enumeration: Projection

Defined in: [webdggrid.ts:51](https://github.com/am2222/webDggrid/blob/c7cf69c5175afdde226a5d2551125aeddfcbf081/src-ts/webdggrid.ts#L51)

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

Defined in: [webdggrid.ts:55](https://github.com/am2222/webDggrid/blob/c7cf69c5175afdde226a5d2551125aeddfcbf081/src-ts/webdggrid.ts#L55)

Fuller/Dymaxion projection — shape-preserving cells.

***

### ISEA

> **ISEA**: `"ISEA"`

Defined in: [webdggrid.ts:53](https://github.com/am2222/webDggrid/blob/c7cf69c5175afdde226a5d2551125aeddfcbf081/src-ts/webdggrid.ts#L53)

Icosahedral Snyder Equal Area projection — equal-area cells.
