[webdggrid](../globals.md) / DGGSGeoJsonProperty

# Type Alias: DGGSGeoJsonProperty

> **DGGSGeoJsonProperty** = `GeoJsonProperties` & `object`

Defined in: [webdggrid.ts:102](https://github.com/am2222/webDggrid/blob/46d3220e4b260396a281ac7fc8c31a562326bb54/src-ts/webdggrid.ts#L102)

GeoJSON `properties` object attached to every cell feature returned by
[Webdggrid.sequenceNumToGridFeatureCollection](../classes/Webdggrid.md#sequencenumtogridfeaturecollection).

All numeric identifiers are `BigInt` because DGGRID cell sequence numbers
can exceed the safe integer range of IEEE-754 doubles at high resolutions.

> **Note for MapLibre / Mapbox users:** structured-clone (used internally
> by these libraries' Web Workers) cannot serialise `BigInt`. Convert `id`
> to a string before calling `source.setData()`.

## Type Declaration

### i?

> `optional` **i?**: `BigInt`

Column index in an (i, j) address scheme, if available.

### id?

> `optional` **id?**: `BigInt`

The DGGS sequence number (cell ID) of this feature.
Unique within a given DGGS configuration and resolution.

### j?

> `optional` **j?**: `BigInt`

Row index in an (i, j) address scheme, if available.
