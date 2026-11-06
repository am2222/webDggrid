[webdggrid](../globals.md) / CellBoundaryOptions

# Interface: CellBoundaryOptions

Defined in: [webdggrid.ts:164](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L164)

Options for the cell boundaries returned by
[Webdggrid.sequenceNumToGrid](../classes/Webdggrid.md#sequencenumtogrid) and
[Webdggrid.sequenceNumToGridFeatureCollection](../classes/Webdggrid.md#sequencenumtogridfeaturecollection).

## Properties

### densification?

> `optional` **densification?**: `number`

Defined in: [webdggrid.ts:177](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L177)

Number of points inserted along each cell edge (DGGRID
`densification`), 0–500. Densified edges follow the projection, so the
boundary keeps its true shape when drawn with straight lines.
Defaults to `0`.

***

### edgeCrossings?

> `optional` **edgeCrossings?**: `boolean`

Defined in: [webdggrid.ts:185](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L185)

Insert the points where a cell edge crosses an icosahedron face edge
and bends there (DGGRID 9.2 `insert_cell_bdry_edge_crossing`). Without
them, an edge that spans two faces is drawn as one straight segment.
With `densification`, each piece between these points is densified.
Defaults to `false`.

***

### unwrap?

> `optional` **unwrap?**: `boolean`

Defined in: [webdggrid.ts:170](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L170)

Pass antimeridian-crossing rings through [unwrapAntimeridianRing](../functions/unwrapAntimeridianRing.md)
so longitudes stay contiguous (they may exceed 180°). Defaults to
`true`. See [Webdggrid.sequenceNumToGrid](../classes/Webdggrid.md#sequencenumtogrid).
