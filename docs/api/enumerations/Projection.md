[webdggrid](../globals.md) / Projection

# Enumeration: Projection

Defined in: [webdggrid.ts:54](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L54)

The map projection used to place the polyhedron faces onto the sphere.

- **ISEA** (Icosahedral Snyder Equal Area) — preserves cell area at the cost
  of shape distortion. Recommended for most analytical use-cases.
- **IVEA** (Icosahedral Vertex-oriented Equal Area) — equal-area, with
  distortion arranged around the icosahedron vertices instead of the face
  centres.
- **FULLER** (Fuller/Dymaxion) — minimises shape distortion but does not
  preserve equal area.
- **GNOMONIC** (icosahedral gnomonic) — not equal-area; cell edges are
  great-circle arcs. This is the projection H3 uses.

## Export

## Example

```ts
import { Projection } from 'webdggrid';

dggs.setDggs({ projection: Projection.ISEA, ... }, 4);
```

## Enumeration Members

### FULLER

> **FULLER**: `"FULLER"`

Defined in: [webdggrid.ts:60](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L60)

Fuller/Dymaxion projection — shape-preserving cells.

***

### GNOMONIC

> **GNOMONIC**: `"GNOMONIC"`

Defined in: [webdggrid.ts:62](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L62)

Icosahedral gnomonic projection — great-circle cell edges (as in H3).

***

### ISEA

> **ISEA**: `"ISEA"`

Defined in: [webdggrid.ts:56](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L56)

Icosahedral Snyder Equal Area projection — equal-area cells.

***

### IVEA

> **IVEA**: `"IVEA"`

Defined in: [webdggrid.ts:58](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L58)

Icosahedral Vertex-oriented Equal Area projection — equal-area cells.
