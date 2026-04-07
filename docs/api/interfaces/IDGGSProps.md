[webdggrid](../globals.md) / IDGGSProps

# Interface: IDGGSProps

Defined in: [webdggrid.ts:136](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L136)

Full configuration of a Discrete Global Grid System.

A DGGS is fully defined by its polyhedron orientation (`poleCoordinates`,
`azimuth`), the subdivision scheme (`aperture`), the cell shape
(`topology`), and the map projection (`projection`).

Pass this object to [Webdggrid.setDggs](../classes/Webdggrid.md#setdggs) to switch between grid
configurations at runtime.

## Example

```ts
const myDggs: IDGGSProps = {
  poleCoordinates: { lat: 58.28, lng: 11.25 }, // Snyder orientation
  azimuth: 0,
  aperture: 4,
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
};
dggs.setDggs(myDggs, 5);
```

## Properties

### aperture?

> `optional` **aperture?**: `7` \| `3` \| `4` \| `5`

Defined in: [webdggrid.ts:162](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L162)

Subdivision aperture — the number of child cells each parent cell is
divided into when moving to the next finer resolution.

| Aperture | Cells at res *r* (HEXAGON/ISEA) |
|---|---|
| 3 | 2 + 10 × 3^r |
| 4 | 2 + 10 × 4^r |
| 7 | 2 + 10 × 7^r |

Aperture `4` is the most common choice and is the default.
Ignored if `apertureSequence` is specified.

***

### apertureSequence?

> `optional` **apertureSequence?**: `string`

Defined in: [webdggrid.ts:181](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L181)

Mixed aperture sequence (e.g., `"434747"`).

When specified, each character defines the aperture for that resolution level.
The maximum resolution is limited to the length of the sequence string.

**Constraints:**
- Only valid for `HEXAGON` topology
- Only characters `'3'`, `'4'`, and `'7'` are allowed
- SEQNUM addressing is not supported (operations will fail)
- Z3/Z7 hierarchical indexing is not supported

#### Example

```ts
// Resolution 1 uses aperture 4, res 2 uses aperture 3, etc.
apertureSequence: "434747"
```

***

### azimuth

> **azimuth**: `number`

Defined in: [webdggrid.ts:148](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L148)

Azimuth of the icosahedron pole in decimal degrees.
Rotates the grid around the pole axis. Defaults to `0`.

***

### poleCoordinates

> **poleCoordinates**: [`Coordinate`](Coordinate.md)

Defined in: [webdggrid.ts:143](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L143)

Geographic location of the icosahedron pole used to orient the grid.
Changing this rotates the entire grid on the globe, which can be used
to minimise cell distortion over a region of interest.
Defaults to `{ lat: 0, lng: 0 }`.

***

### projection

> **projection**: [`Projection`](../enumerations/Projection.md)

Defined in: [webdggrid.ts:185](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L185)

Projection used to map the polyhedron faces onto the sphere. See [Projection](../enumerations/Projection.md).

***

### topology

> **topology**: [`Topology`](../enumerations/Topology.md)

Defined in: [webdggrid.ts:183](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L183)

Shape of each cell. See [Topology](../enumerations/Topology.md).
