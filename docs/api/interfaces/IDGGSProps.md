[webdggrid](../globals.md) / IDGGSProps

# Interface: IDGGSProps

Defined in: [webdggrid.ts:181](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L181)

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

Defined in: [webdggrid.ts:207](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L207)

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

Defined in: [webdggrid.ts:226](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L226)

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

Defined in: [webdggrid.ts:193](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L193)

Azimuth of the icosahedron pole in decimal degrees.
Rotates the grid around the pole axis. Defaults to `0`.

***

### datum?

> `optional` **datum?**: [`Datum`](../enumerations/Datum.md)

Defined in: [webdggrid.ts:235](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L235)

Datum of geographic input and output coordinates. See [Datum](../enumerations/Datum.md).
Defaults to `AUTHALIC_SPHERE`.

***

### poleCoordinates

> **poleCoordinates**: [`Coordinate`](Coordinate.md)

Defined in: [webdggrid.ts:188](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L188)

Geographic location of the icosahedron pole used to orient the grid.
Changing this rotates the entire grid on the globe, which can be used
to minimise cell distortion over a region of interest.
Defaults to `{ lat: 0, lng: 0 }`.

***

### projection

> **projection**: [`Projection`](../enumerations/Projection.md)

Defined in: [webdggrid.ts:230](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L230)

Projection used to map the polyhedron faces onto the sphere. See [Projection](../enumerations/Projection.md).

***

### sphereRadiusKm?

> `optional` **sphereRadiusKm?**: `number`

Defined in: [webdggrid.ts:242](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L242)

Radius in km of the sphere the grid is built on. Only cell areas and
distances depend on it. `0` or omitted means the WGS84 authalic radius
(6371.0072 km); otherwise 1–10000. `datum: WGS84` requires the
authalic radius.

***

### topology

> **topology**: [`Topology`](../enumerations/Topology.md)

Defined in: [webdggrid.ts:228](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L228)

Shape of each cell. See [Topology](../enumerations/Topology.md).
