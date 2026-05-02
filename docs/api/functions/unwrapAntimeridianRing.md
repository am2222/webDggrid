[webdggrid](../globals.md) / unwrapAntimeridianRing

# Function: unwrapAntimeridianRing()

> **unwrapAntimeridianRing**(`ring`): `Position`[]

Defined in: [webdggrid.ts:202](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L202)

Rewraps a polygon ring that crosses the antimeridian so that all longitudes
are in a contiguous range. The output longitudes may fall outside
[-180, 180] — that's intentional, and is the format expected by MapLibre
GL / Mapbox GL globe projection for antimeridian cells. For renderers that
require standard [-180, 180] coordinates, run a final modulo step
downstream.

Walks consecutive vertices and accumulates a ±360 offset whenever the
longitude delta between neighbours exceeds 180° (the only meaningful sign
of an antimeridian crossing). This keeps the traversal direction faithful
even for polar caps, which span a full 360° in lon and were broken by the
previous "negative-to-positive" rewrite.

## Parameters

### ring

`Position`[]

## Returns

`Position`[]
