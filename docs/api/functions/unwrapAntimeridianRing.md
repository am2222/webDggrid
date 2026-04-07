[webdggrid](../globals.md) / unwrapAntimeridianRing

# Function: unwrapAntimeridianRing()

> **unwrapAntimeridianRing**(`ring`): `Position`[]

Defined in: [webdggrid.ts:176](https://github.com/am2222/webDggrid/blob/a24ad3ecde9ef8dfccfd354cdeff3315e58b4588/src-ts/webdggrid.ts#L176)

Rewraps a polygon ring that crosses the antimeridian so that all longitudes
are in a contiguous range (some may exceed 180°).  This is the format
expected by MapLibre GL / Mapbox GL globe projection for antimeridian cells.
For renderers that require standard [-180, 180] coordinates, use the raw
output from [Webdggrid.sequenceNumToGrid](../classes/Webdggrid.md#sequencenumtogrid) directly.

## Parameters

### ring

`Position`[]

## Returns

`Position`[]
