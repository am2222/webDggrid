[webdggrid](../index.md) / IDGGSProps

# Interface: IDGGSProps

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

Subdivision aperture — the number of child cells each parent cell is
divided into when moving to the next finer resolution.

| Aperture | Cells at res *r* (HEXAGON/ISEA) |
|---|---|
| 3 | 2 + 10 × 3^r |
| 4 | 2 + 10 × 4^r |
| 7 | 2 + 10 × 7^r |

Aperture `4` is the most common choice and is the default.

#### Source

[src-ts/webdggrid.ts:144](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L144)

***

### azimuth

> **azimuth**: `number`

Azimuth of the icosahedron pole in decimal degrees.
Rotates the grid around the pole axis. Defaults to `0`.

#### Source

[src-ts/webdggrid.ts:131](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L131)

***

### poleCoordinates

> **poleCoordinates**: [`Coordinate`](Coordinate.md)

Geographic location of the icosahedron pole used to orient the grid.
Changing this rotates the entire grid on the globe, which can be used
to minimise cell distortion over a region of interest.
Defaults to `{ lat: 0, lng: 0 }`.

#### Source

[src-ts/webdggrid.ts:126](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L126)

***

### projection

> **projection**: [`Projection`](../enumerations/Projection.md)

Projection used to map the polyhedron faces onto the sphere. See [Projection](../enumerations/Projection.md).

#### Source

[src-ts/webdggrid.ts:148](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L148)

***

### topology

> **topology**: [`Topology`](../enumerations/Topology.md)

Shape of each cell. See [Topology](../enumerations/Topology.md).

#### Source

[src-ts/webdggrid.ts:146](https://github.com/am2222/webDggrid/blob/8dc897a/src-ts/webdggrid.ts#L146)
