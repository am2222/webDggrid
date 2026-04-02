[webdggrid](../globals.md) / IDGGSProps

# Interface: IDGGSProps

Defined in: [webdggrid.ts:117](https://github.com/am2222/webDggrid/blob/65def59943930968d36ed9bfe61774f2de8adf34/src-ts/webdggrid.ts#L117)

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

### aperture

> **aperture**: `3` \| `4` \| `5` \| `7`

Defined in: [webdggrid.ts:142](https://github.com/am2222/webDggrid/blob/65def59943930968d36ed9bfe61774f2de8adf34/src-ts/webdggrid.ts#L142)

Subdivision aperture — the number of child cells each parent cell is
divided into when moving to the next finer resolution.

| Aperture | Cells at res *r* (HEXAGON/ISEA) |
|---|---|
| 3 | 2 + 10 × 3^r |
| 4 | 2 + 10 × 4^r |
| 7 | 2 + 10 × 7^r |

Aperture `4` is the most common choice and is the default.

***

### azimuth

> **azimuth**: `number`

Defined in: [webdggrid.ts:129](https://github.com/am2222/webDggrid/blob/65def59943930968d36ed9bfe61774f2de8adf34/src-ts/webdggrid.ts#L129)

Azimuth of the icosahedron pole in decimal degrees.
Rotates the grid around the pole axis. Defaults to `0`.

***

### poleCoordinates

> **poleCoordinates**: [`Coordinate`](Coordinate.md)

Defined in: [webdggrid.ts:124](https://github.com/am2222/webDggrid/blob/65def59943930968d36ed9bfe61774f2de8adf34/src-ts/webdggrid.ts#L124)

Geographic location of the icosahedron pole used to orient the grid.
Changing this rotates the entire grid on the globe, which can be used
to minimise cell distortion over a region of interest.
Defaults to `{ lat: 0, lng: 0 }`.

***

### projection

> **projection**: [`Projection`](../enumerations/Projection.md)

Defined in: [webdggrid.ts:146](https://github.com/am2222/webDggrid/blob/65def59943930968d36ed9bfe61774f2de8adf34/src-ts/webdggrid.ts#L146)

Projection used to map the polyhedron faces onto the sphere. See [Projection](../enumerations/Projection.md).

***

### topology

> **topology**: [`Topology`](../enumerations/Topology.md)

Defined in: [webdggrid.ts:144](https://github.com/am2222/webDggrid/blob/65def59943930968d36ed9bfe61774f2de8adf34/src-ts/webdggrid.ts#L144)

Shape of each cell. See [Topology](../enumerations/Topology.md).
