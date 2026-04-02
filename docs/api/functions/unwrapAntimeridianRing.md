[webdggrid](../index.md) / unwrapAntimeridianRing

# Function: unwrapAntimeridianRing()

> **unwrapAntimeridianRing**(`ring`): `Position`[]

Rewraps a polygon ring that crosses the antimeridian so that all longitudes
are in a contiguous range (some may exceed 180°).  This is the format
expected by MapLibre GL / Mapbox GL globe projection for antimeridian cells.
For renderers that require standard [-180, 180] coordinates, use the raw
output from [Webdggrid.sequenceNumToGrid](../classes/Webdggrid.md#sequencenumtogrid) directly.

## Parameters

• **ring**: `Position`[]

## Returns

`Position`[]

## Source

[src-ts/webdggrid.ts:158](https://github.com/am2222/webDggrid/blob/5796c44/src-ts/webdggrid.ts#L158)
