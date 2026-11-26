[webdggrid](../globals.md) / DGGSGeoJsonProperty

# Type Alias: DGGSGeoJsonProperty

> **DGGSGeoJsonProperty** = `GeoJsonProperties` & `object`

Defined in: [webdggrid.ts:164](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L164)

GeoJSON `properties` object attached to every cell feature returned by
[Webdggrid.sequenceNumToGridFeatureCollection](../classes/Webdggrid.md#sequencenumtogridfeaturecollection).

All numeric identifiers are `BigInt` because DGGRID cell sequence numbers
can exceed the safe integer range of IEEE-754 doubles at high resolutions.

> **Note for MapLibre / Mapbox users:** structured-clone (used internally
> by these libraries' Web Workers) cannot serialise `BigInt`. Convert `id`
> to a string before calling `source.setData()`.

## Type Declaration

### i?

> `optional` **i?**: `bigint`

Column index in an (i, j) address scheme, if available.

### id?

> `optional` **id?**: `bigint`

The DGGS sequence number (cell ID) of this feature.
Unique within a given DGGS configuration and resolution.

### j?

> `optional` **j?**: `bigint`

Row index in an (i, j) address scheme, if available.
