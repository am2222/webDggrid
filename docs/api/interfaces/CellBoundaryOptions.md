[webdggrid](../globals.md) / CellBoundaryOptions

# Interface: CellBoundaryOptions

Defined in: [webdggrid.ts:181](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L181)

Options for the cell boundaries returned by
[Webdggrid.sequenceNumToGrid](../classes/Webdggrid.md#sequencenumtogrid) and
[Webdggrid.sequenceNumToGridFeatureCollection](../classes/Webdggrid.md#sequencenumtogridfeaturecollection).

## Properties

### densification?

> `optional` **densification?**: `number`

Defined in: [webdggrid.ts:194](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L194)

Number of points inserted along each cell edge (DGGRID
`densification`), 0–500. Densified edges follow the projection, so the
boundary keeps its true shape when drawn with straight lines.
Defaults to `0`.

***

### edgeCrossings?

> `optional` **edgeCrossings?**: `boolean`

Defined in: [webdggrid.ts:202](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L202)

Insert the points where a cell edge crosses an icosahedron face edge
and bends there (DGGRID 9.2 `insert_cell_bdry_edge_crossing`). Without
them, an edge that spans two faces is drawn as one straight segment.
With `densification`, each piece between these points is densified.
Defaults to `false`.

***

### unwrap?

> `optional` **unwrap?**: `boolean`

Defined in: [webdggrid.ts:187](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L187)

Pass antimeridian-crossing rings through [unwrapAntimeridianRing](../functions/unwrapAntimeridianRing.md)
so longitudes stay contiguous (they may exceed 180°). Defaults to
`true`. See [Webdggrid.sequenceNumToGrid](../classes/Webdggrid.md#sequencenumtogrid).
