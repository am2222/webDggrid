[webdggrid](../index.md) / DGGSGeoJsonProperty

# Type alias: DGGSGeoJsonProperty

> **DGGSGeoJsonProperty**: `GeoJsonProperties` & `Object`

GeoJSON `properties` object attached to every cell feature returned by
[Webdggrid.sequenceNumToGridFeatureCollection](../classes/Webdggrid.md#sequencenumtogridfeaturecollection).

All numeric identifiers are `BigInt` because DGGRID cell sequence numbers
can exceed the safe integer range of IEEE-754 doubles at high resolutions.

> **Note for MapLibre / Mapbox users:** structured-clone (used internally
> by these libraries' Web Workers) cannot serialise `BigInt`. Convert `id`
> to a string before calling `source.setData()`.

## Type declaration

### i?

> **`optional`** **i**: `BigInt`

Column index in an (i, j) address scheme, if available.

### id?

> **`optional`** **id**: `BigInt`

The DGGS sequence number (cell ID) of this feature.
Unique within a given DGGS configuration and resolution.

### j?

> **`optional`** **j**: `BigInt`

Row index in an (i, j) address scheme, if available.

## Source

[src-ts/webdggrid.ts:85](https://github.com/am2222/webDggrid/blob/fd60a5b/src-ts/webdggrid.ts#L85)
