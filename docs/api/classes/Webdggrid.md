[webdggrid](../globals.md) / Webdggrid

# Class: Webdggrid

Defined in: [webdggrid.ts:252](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L252)

Main entry point for the WebDggrid library.

`Webdggrid` wraps the DGGRID C++ library compiled to WebAssembly and exposes
methods for:
- **Grid configuration** — choose topology, projection, aperture, and
  resolution via [setDggs](#setdggs) / [setResolution](#setresolution).
- **Coordinate conversion** — convert between geographic coordinates and
  DGGS cell IDs (sequence numbers) with [geoToSequenceNum](#geotosequencenum) and
  [sequenceNumToGeo](#sequencenumtogeo).
- **Grid geometry** — retrieve the polygon boundary of any cell with
  [sequenceNumToGrid](#sequencenumtogrid) or export a ready-to-render GeoJSON
  `FeatureCollection` with [sequenceNumToGridFeatureCollection](#sequencenumtogridfeaturecollection).
- **Grid statistics** — query cell counts, areas, and spacings with
  [nCells](#ncells), [cellAreaKM](#cellareakm), and [cellDistKM](#celldistkm).

## Quick start

```ts
import { Webdggrid } from 'webdggrid';

const dggs = await Webdggrid.load();

// Convert a geographic point to its DGGS cell ID at resolution 5
const [cellId] = dggs.geoToSequenceNum([[-73.9857, 40.7484]], 5);

// Get the polygon boundary of that cell as GeoJSON
const geojson = dggs.sequenceNumToGridFeatureCollection([cellId], 5);
```

## Lifecycle

The WASM module is a singleton. Call [Webdggrid.load](#load) once and reuse
the returned instance throughout your application. Call
[Webdggrid.unload](#unload) when you are completely done to free memory.

## Properties

### \_module

> `protected` **\_module**: `any`

Defined in: [webdggrid.ts:275](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L275)

***

### dggs

> **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

Defined in: [webdggrid.ts:261](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L261)

The active DGGS configuration used by all conversion and statistics
methods. Change it at any time via [setDggs](#setdggs).

Defaults to ISEA4H (ISEA projection, aperture 4, hexagon topology,
pole at 0° N 0° E, azimuth 0°).

***

### resolution

> **resolution**: `number` = `DEFAULT_RESOLUTION`

Defined in: [webdggrid.ts:273](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L273)

The active grid resolution. Higher values produce finer, smaller cells.
The valid range depends on the aperture — for aperture 4 the practical
limit is around resolution 15 before cell counts become unwieldy.

Change via [setResolution](#setresolution) or pass an explicit `resolution`
argument to any conversion method.

Defaults to `1`.

## Methods

### \_main()

> **\_main**(): `any`

Defined in: [webdggrid.ts:386](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L386)

**`Internal`**

Internal test helper that invokes the WASM module's `_main` entry point.
Not intended for production use.

#### Returns

`any`

***

### cellAreaKM()

> **cellAreaKM**(`resolution?`): `number`

Defined in: [webdggrid.ts:457](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L457)

Returns the average area of a single cell in square kilometres at the
given resolution.

Because ISEA guarantees equal-area cells, all cells have the same area
when using the `ISEA` projection. With `FULLER` the value is an average.

```ts
const areakm2 = dggs.cellAreaKM(5);
```

#### Parameters

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level to query. Defaults to the instance's
  current [resolution](#cellareakm).

#### Returns

`number`

Average cell area in km².

***

### cellDistKM()

> **cellDistKM**(`resolution?`): `number`

Defined in: [webdggrid.ts:500](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L500)

Returns the average centre-to-centre distance between neighbouring cells
in kilometres at the given resolution.

This is useful for estimating spatial join radii or selecting a
resolution that matches a target spatial scale.

```ts
const spacingKm = dggs.cellDistKM(5);
```

#### Parameters

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level to query. Defaults to the instance's
  current [resolution](#celldistkm).

#### Returns

`number`

Average cell spacing in km.

***

### geoToGeo()

> **geoToGeo**(`coordinates`, `resolution?`): `Position`[]

Defined in: [webdggrid.ts:720](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L720)

Snaps an array of geographic coordinates to the centroid of the DGGS
cell that contains each point.

This is equivalent to calling [geoToSequenceNum](#geotosequencenum) followed by
[sequenceNumToGeo](#sequencenumtogeo) but is more efficient because it avoids
returning the intermediate sequence numbers.

Useful for spatial aggregation: all points that fall within the same
cell will map to the identical centroid coordinate.

Coordinates must be in **`[lng, lat]`** order.

```ts
const snapped = dggs.geoToGeo(
  [[-74.006, 40.7128], [-74.010, 40.720]],
  5
);
// Both points snap to the same centroid if they share a cell
```

#### Parameters

##### coordinates

`number`[][]

Array of `[lng, lat]` pairs in decimal degrees.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which to perform the snapping. Defaults
  to the instance's current [resolution](#geotogeo).

#### Returns

`Position`[]

Array of `[lng, lat]` cell centroid positions, one per input
  coordinate, in the same order.

***

### geoToPlane()

> **geoToPlane**(`coordinates`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1544](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1544)

Converts geographic coordinates to PLANE coordinates.

#### Parameters

##### coordinates

`number`[][]

Array of `[lng, lat]` pairs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{x, y}` plane coordinates

***

### geoToProjtri()

> **geoToProjtri**(`coordinates`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1565](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1565)

Converts geographic coordinates to PROJTRI coordinates.

#### Parameters

##### coordinates

`number`[][]

Array of `[lng, lat]` pairs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{tnum, x, y}` projection triangle coordinates

***

### geoToQ2dd()

> **geoToQ2dd**(`coordinates`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1590](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1590)

Converts geographic coordinates to Q2DD coordinates.

#### Parameters

##### coordinates

`number`[][]

Array of `[lng, lat]` pairs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, x, y}` quad 2D double coordinates

***

### geoToQ2di()

> **geoToQ2di**(`coordinates`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1615](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1615)

Converts geographic coordinates to Q2DI coordinates.

#### Parameters

##### coordinates

`number`[][]

Array of `[lng, lat]` pairs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, i, j}` quad 2D integer coordinates

***

### geoToSequenceNum()

> **geoToSequenceNum**(`coordinates`, `resolution?`): `bigint`[]

Defined in: [webdggrid.ts:601](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L601)

Converts an array of geographic coordinates to their corresponding DGGS
cell sequence numbers (cell IDs) at the given resolution.

Each coordinate is mapped to the single cell whose boundary contains it.
Multiple coordinates that fall within the same cell will return the same
sequence number.

Coordinates must be supplied in **`[lng, lat]`** order (GeoJSON
convention), **not** `[lat, lng]`.

```ts
// New York City
const ids = dggs.geoToSequenceNum([[-74.006, 40.7128]], 5);
console.log(ids); // [12345n]

// Multiple points at once
const ids2 = dggs.geoToSequenceNum(
  [[-74.006, 40.7128], [2.3522, 48.8566]],
  5
);
```

#### Parameters

##### coordinates

`number`[][]

Array of `[lng, lat]` pairs in decimal degrees.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which to perform the lookup. Defaults
  to the instance's current [resolution](#geotosequencenum).

#### Returns

`bigint`[]

Array of `BigInt` sequence numbers, one per input coordinate,
  in the same order.

***

### getResolution()

> **getResolution**(): `number`

Defined in: [webdggrid.ts:362](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L362)

Returns the currently active grid resolution.

```ts
dggs.setResolution(7);
console.log(dggs.getResolution()); // 7
```

#### Returns

`number`

The current resolution level.

***

### gridStatCLS()

> **gridStatCLS**(`resolution?`): `number`

Defined in: [webdggrid.ts:544](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L544)

Returns the characteristic length scale (CLS) of the grid at the given
resolution — defined as the square root of the average cell area.

CLS provides a single scalar that summarises the spatial granularity of
the grid, useful for comparing resolutions across different DGGS
configurations.

```ts
const cls = dggs.gridStatCLS(4);
```

#### Parameters

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level to query. Defaults to the instance's
  current [resolution](#gridstatcls).

#### Returns

`number`

Grid CLS value.

***

### nCells()

> **nCells**(`resolution?`): `number`

Defined in: [webdggrid.ts:414](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L414)

Returns the total number of cells that tile the entire globe at the
given resolution under the current DGGS configuration.

Cell counts grow exponentially with resolution. For the default ISEA4H
grid:

| Resolution | Approx. cell count |
|---|---|
| 1 | 42 |
| 2 | 162 |
| 3 | 642 |
| 4 | 2 562 |
| 5 | 10 242 |
| 6 | 40 962 |

```ts
const total = dggs.nCells(3); // 642
```

#### Parameters

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level to query. Defaults to the instance's
  current [resolution](#ncells).

#### Returns

`number`

Total number of cells at the given resolution.

***

### projtriToGeo()

> **projtriToGeo**(`coords`, `resolution?`): `Position`[]

Defined in: [webdggrid.ts:1962](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1962)

Converts PROJTRI coordinates to geographic coordinates.

#### Parameters

##### coords

`object`[]

Array of `{tnum, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`Position`[]

Array of `[lng, lat]` positions

***

### projtriToPlane()

> **projtriToPlane**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1999](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1999)

Converts PROJTRI coordinates to PLANE coordinates.

#### Parameters

##### coords

`object`[]

Array of `{tnum, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{x, y}` plane coordinates

***

### projtriToQ2dd()

> **projtriToQ2dd**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:2021](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L2021)

Converts PROJTRI coordinates to Q2DD coordinates.

#### Parameters

##### coords

`object`[]

Array of `{tnum, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, x, y}` quad 2D double coordinates

***

### projtriToQ2di()

> **projtriToQ2di**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:2047](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L2047)

Converts PROJTRI coordinates to Q2DI coordinates.

#### Parameters

##### coords

`object`[]

Array of `{tnum, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, i, j}` quad 2D integer coordinates

***

### projtriToSequenceNum()

> **projtriToSequenceNum**(`coords`, `resolution?`): `bigint`[]

Defined in: [webdggrid.ts:1984](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1984)

Converts PROJTRI coordinates to sequence numbers.

#### Parameters

##### coords

`object`[]

Array of `{tnum, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`bigint`[]

Array of cell IDs

***

### q2ddToGeo()

> **q2ddToGeo**(`coords`, `resolution?`): `Position`[]

Defined in: [webdggrid.ts:1847](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1847)

Converts Q2DD coordinates to geographic coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`Position`[]

Array of `[lng, lat]` positions

***

### q2ddToPlane()

> **q2ddToPlane**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1884](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1884)

Converts Q2DD coordinates to PLANE coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{x, y}` plane coordinates

***

### q2ddToProjtri()

> **q2ddToProjtri**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1906](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1906)

Converts Q2DD coordinates to PROJTRI coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{tnum, x, y}` projection triangle coordinates

***

### q2ddToQ2di()

> **q2ddToQ2di**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1932](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1932)

Converts Q2DD coordinates to Q2DI coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, i, j}` quad 2D integer coordinates

***

### q2ddToSequenceNum()

> **q2ddToSequenceNum**(`coords`, `resolution?`): `bigint`[]

Defined in: [webdggrid.ts:1869](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1869)

Converts Q2DD coordinates to sequence numbers.

#### Parameters

##### coords

`object`[]

Array of `{quad, x, y}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`bigint`[]

Array of cell IDs

***

### q2diToGeo()

> **q2diToGeo**(`coords`, `resolution?`): `Position`[]

Defined in: [webdggrid.ts:1732](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1732)

Converts Q2DI coordinates to geographic coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, i, j}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`Position`[]

Array of `[lng, lat]` positions

***

### q2diToPlane()

> **q2diToPlane**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1769](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1769)

Converts Q2DI coordinates to PLANE coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, i, j}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{x, y}` plane coordinates

***

### q2diToProjtri()

> **q2diToProjtri**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1791](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1791)

Converts Q2DI coordinates to PROJTRI coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, i, j}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{tnum, x, y}` projection triangle coordinates

***

### q2diToQ2dd()

> **q2diToQ2dd**(`coords`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1817](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1817)

Converts Q2DI coordinates to Q2DD coordinates.

#### Parameters

##### coords

`object`[]

Array of `{quad, i, j}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, x, y}` quad 2D double coordinates

***

### q2diToSequenceNum()

> **q2diToSequenceNum**(`coords`, `resolution?`): `bigint`[]

Defined in: [webdggrid.ts:1754](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1754)

Converts Q2DI coordinates to sequence numbers.

#### Parameters

##### coords

`object`[]

Array of `{quad, i, j}` coordinates

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`bigint`[]

Array of cell IDs

***

### sequenceNumChildren()

> **sequenceNumChildren**(`sequenceNum`, `resolution?`): `bigint`[][]

Defined in: [webdggrid.ts:1085](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1085)

Returns all child cells at the next finer resolution (resolution + 1)
for each input cell.

The number of children depends on the aperture:
- Aperture 3: 3 children per parent
- Aperture 4: 4 children per parent
- Aperture 7: 7 children per parent

The output is a 2-D array: `result[i]` contains all children of
`sequenceNum[i]`.

```ts
const children = dggs.sequenceNumChildren([30n], 4);
// children[0] = [120n, 121n, 122n, 123n]  (at resolution 5, aperture 4)
```

::: info
Children always include both boundary and interior cells. The returned
cells completely cover the parent cell's area.
:::

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs whose children to find.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the input IDs were generated.
  Defaults to the instance's current [resolution](#sequencenumchildren).

#### Returns

`bigint`[][]

A 2-D array of `BigInt[]`: `result[i]` is the array of child
  IDs for `sequenceNum[i]` at resolution + 1.

#### Throws

If an invalid cell ID is provided or if the maximum resolution
  is exceeded.

***

### sequenceNumNeighbors()

> **sequenceNumNeighbors**(`sequenceNum`, `resolution?`): `bigint`[][]

Defined in: [webdggrid.ts:935](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L935)

Returns all neighboring cells (sharing an edge) for each input cell.

For hexagonal grids, each interior cell typically has 6 neighbors.
Pentagon cells and boundary cells may have fewer. Triangle topology
is not supported by the underlying DGGRID library.

The output is a 2-D array: `result[i]` contains all neighbors of
`sequenceNum[i]`.

```ts
const neighbors = dggs.sequenceNumNeighbors([123n], 5);
// neighbors[0] = [122n, 124n, 125n, 126n, 127n, 128n]
```

::: warning
Triangle topology is **not supported**. Attempting to retrieve neighbors
for a TRIANGLE grid will throw an error.
:::

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs whose neighbors to find.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the IDs were generated. Defaults
  to the instance's current [resolution](#sequencenumneighbors).

#### Returns

`bigint`[][]

A 2-D array of `BigInt[]`: `result[i]` is the array of neighbor
  IDs for `sequenceNum[i]`.

#### Throws

If Triangle topology is used or if an invalid cell ID is provided.

***

### sequenceNumParent()

> **sequenceNumParent**(`sequenceNum`, `resolution?`): `bigint`[]

Defined in: [webdggrid.ts:1014](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1014)

Returns the parent cell at the next coarser resolution (resolution - 1)
for each input cell.

The parent-child relationship forms a hierarchical index structure. For
aperture 4 grids, each parent contains 4 children; for aperture 7, each
parent contains 7 children.

```ts
const parents = dggs.sequenceNumParent([123n, 456n], 5);
// parents = [30n, 114n]  (at resolution 4)
```

::: info
Calling this method at resolution 0 will throw an error because there
are no cells at resolution -1.
:::

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs whose parents to find.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the input IDs were generated.
  Must be > 0. Defaults to the instance's current [resolution](#sequencenumparent).

#### Returns

`bigint`[]

Array of `BigInt` parent cell IDs at resolution - 1, one per
  input cell, in the same order.

#### Throws

If resolution is 0 or if an invalid cell ID is provided.

***

### sequenceNumToGeo()

> **sequenceNumToGeo**(`sequenceNum`, `resolution?`): `Position`[]

Defined in: [webdggrid.ts:655](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L655)

Converts an array of DGGS cell sequence numbers to the geographic
coordinates of their centroids.

The returned coordinates are in **`[lng, lat]`** order (GeoJSON
convention).

```ts
const centroids = dggs.sequenceNumToGeo([1n, 2n, 3n], 3);
// [[lng0, lat0], [lng1, lat1], [lng2, lat2]]
```

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs to look up.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the IDs were generated. Defaults
  to the instance's current [resolution](#sequencenumtogeo).

#### Returns

`Position`[]

Array of `[lng, lat]` centroid positions, one per input ID, in
  the same order.

***

### sequenceNumToGrid()

> **sequenceNumToGrid**(`sequenceNum`, `resolution?`): `Position`[][]

Defined in: [webdggrid.ts:785](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L785)

Returns the polygon boundary vertices for each cell in `sequenceNum`.

Each cell is represented as an array of `[lng, lat]` vertex positions.
The ring is **not** automatically closed (the first and last vertex are
different) — close it yourself if your renderer requires it.

Prefer [sequenceNumToGridFeatureCollection](#sequencenumtogridfeaturecollection) when you need
GeoJSON output ready for a mapping library.

```ts
const rings = dggs.sequenceNumToGrid([1n, 2n], 3);
// rings[0] = [[lng0,lat0], [lng1,lat1], ..., [lng5,lat5]]  (hexagon)
```

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs whose boundaries to
  retrieve.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the IDs were generated. Defaults
  to the instance's current [resolution](#sequencenumtogrid).

#### Returns

`Position`[][]

A 2-D array: `result[i]` is the vertex ring of `sequenceNum[i]`.
  Each vertex is a `[lng, lat]` position.

#### Throws

If the WASM module encounters an invalid cell ID.

***

### sequenceNumToGridFeatureCollection()

> **sequenceNumToGridFeatureCollection**(`sequenceNum`, `resolution?`): `FeatureCollection`\<`Polygon`, `object` & `object`\>

Defined in: [webdggrid.ts:880](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L880)

Converts an array of DGGS cell IDs into a GeoJSON `FeatureCollection`
where each `Feature` is a `Polygon` representing the cell boundary.

This is the primary method for rendering DGGS cells with mapping
libraries such as MapLibre GL JS, Leaflet, or deck.gl.

Each feature includes:
- `geometry` — a closed `Polygon` in `[lng, lat]` coordinate order.
- `id` — the cell sequence number (converted to `string` recommended
  before passing to MapLibre to avoid BigInt serialisation errors).
- `properties.id` — same value as `id`, accessible inside layer
  expressions.

```ts
const ids = dggs.geoToSequenceNum([[-74.006, 40.7128]], 5);
const fc  = dggs.sequenceNumToGridFeatureCollection(ids, 5);

// MapLibre / structured-clone safe: convert BigInt → string
fc.features.forEach(f => {
  if (typeof f.id === 'bigint') f.id = f.id.toString();
  if (f.properties?.id) f.properties.id = f.properties.id.toString();
});

map.getSource('grid').setData(fc);
```

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs to convert.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the IDs were generated. Defaults
  to the instance's current [resolution](#sequencenumtogridfeaturecollection).

#### Returns

`FeatureCollection`\<`Polygon`, `object` & `object`\>

A GeoJSON `FeatureCollection` of `Polygon` features, one per
  input cell ID.

***

### sequenceNumToPlane()

> **sequenceNumToPlane**(`sequenceNum`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1644](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1644)

Converts sequence numbers to PLANE coordinates.

#### Parameters

##### sequenceNum

`bigint`[]

Array of cell IDs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{x, y}` plane coordinates

***

### sequenceNumToProjtri()

> **sequenceNumToProjtri**(`sequenceNum`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1662](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1662)

Converts sequence numbers to PROJTRI coordinates.

#### Parameters

##### sequenceNum

`bigint`[]

Array of cell IDs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{tnum, x, y}` projection triangle coordinates

***

### sequenceNumToQ2dd()

> **sequenceNumToQ2dd**(`sequenceNum`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1684](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1684)

Converts sequence numbers to Q2DD coordinates.

#### Parameters

##### sequenceNum

`bigint`[]

Array of cell IDs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, x, y}` quad 2D double coordinates

***

### sequenceNumToQ2di()

> **sequenceNumToQ2di**(`sequenceNum`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1706](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1706)

Converts sequence numbers to Q2DI coordinates.

#### Parameters

##### sequenceNum

`bigint`[]

Array of cell IDs

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution level

#### Returns

`object`[]

Array of `{quad, i, j}` quad 2D integer coordinates

***

### sequenceNumToVertex2DD()

> **sequenceNumToVertex2DD**(`sequenceNum`, `resolution?`): [`Vertex2DDCoordinate`](../interfaces/Vertex2DDCoordinate.md)

Defined in: [webdggrid.ts:1157](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1157)

Convert a SEQNUM cell ID to VERTEX2DD (icosahedral vertex) coordinates.

VERTEX2DD addresses represent positions relative to the vertices and
triangular faces of the underlying icosahedron.

```ts
const vertex = dggs.sequenceNumToVertex2DD(100n, 5);
// vertex = { keep: true, vertNum: 1, triNum: 1, x: 0.0625, y: 0.054... }
```

#### Parameters

##### sequenceNum

`bigint`

The cell sequence number to convert.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution of the input cell. Defaults to the
  instance's current [resolution](#sequencenumtovertex2dd).

#### Returns

[`Vertex2DDCoordinate`](../interfaces/Vertex2DDCoordinate.md)

An object with `{keep, vertNum, triNum, x, y}` representing
  the vertex coordinate.

***

### sequenceNumToZ3()

> **sequenceNumToZ3**(`sequenceNum`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1329](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1329)

Convert a SEQNUM cell ID to Z3 (base-3 Central Place Indexing) coordinate.

Z3 uses base-3 digit encoding optimized for aperture 3 hexagon grids.
Each parent cell contains exactly 3 children in the hierarchy.

**Compatibility:** Z3 is **only available for aperture 3** hexagon grids.

```ts
// With aperture 3:
const z3 = dggs.sequenceNumToZ3(100n, 5);
// z3 = 1773292353277132799n
```

#### Parameters

##### sequenceNum

`bigint`

The cell sequence number to convert.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution of the input cell. Defaults to the
  instance's current [resolution](#sequencenumtoz3).

#### Returns

`bigint`

A BigInt representing the Z3 coordinate (INT64 format).

#### Throws

If used with an incompatible aperture (not 3) or topology.

***

### sequenceNumToZ7()

> **sequenceNumToZ7**(`sequenceNum`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1424](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1424)

Convert a SEQNUM cell ID to Z7 (base-7 Central Place Indexing) coordinate.

Z7 uses base-7 digit encoding with pure bitarithmetic operations,
optimized for aperture 7 hexagon grids. Each parent cell contains
exactly 7 children in the hierarchy.

**Compatibility:** Z7 is **only available for aperture 7** hexagon grids.

```ts
// With aperture 7:
const z7 = dggs.sequenceNumToZ7(100n, 5);
// z7 = 1153167795211468799n (displayed as hex: 0x1000000000000fff)
```

#### Parameters

##### sequenceNum

`bigint`

The cell sequence number to convert.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution of the input cell. Defaults to the
  instance's current [resolution](#sequencenumtoz7).

#### Returns

`bigint`

A BigInt representing the Z7 coordinate (INT64/hex format).

#### Throws

If used with an incompatible aperture (not 7) or topology.

***

### sequenceNumToZOrder()

> **sequenceNumToZOrder**(`sequenceNum`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1234](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1234)

Convert a SEQNUM cell ID to ZORDER (Z-order curve) coordinate.

ZORDER uses digit-interleaved coordinates to create a space-filling
curve index. This provides good spatial locality for range queries.

**Compatibility:** ZORDER is only available for **aperture 3 and 4**
hexagon grids. It is **NOT supported** for aperture 7.

```ts
// With aperture 4:
const zorder = dggs.sequenceNumToZOrder(100n, 5);
// zorder = 1168684103302643712n
```

#### Parameters

##### sequenceNum

`bigint`

The cell sequence number to convert.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution of the input cell. Defaults to the
  instance's current [resolution](#sequencenumtozorder).

#### Returns

`bigint`

A BigInt representing the Z-order coordinate.

#### Throws

If used with an incompatible aperture (7) or topology.

***

### setDggs()

> **setDggs**(`dggs?`, `resolution?`): `void`

Defined in: [webdggrid.ts:347](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L347)

Sets both the DGGS configuration and the resolution in one call.

All subsequent conversion and statistics methods will use this
configuration unless they receive an explicit `resolution` argument.

```ts
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  aperture: 4,
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
}, 5);
```

#### Parameters

##### dggs?

[`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

The new DGGS configuration. Defaults to ISEA4H at pole (0,0).

##### resolution?

`number` = `DEFAULT_RESOLUTION`

The new resolution level. Defaults to `1`.

#### Returns

`void`

***

### setResolution()

> **setResolution**(`resolution`): `void`

Defined in: [webdggrid.ts:377](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L377)

Sets the grid resolution used by default in all conversion and
statistics methods.

```ts
dggs.setResolution(5);
const count = dggs.nCells(); // uses resolution 5
```

#### Parameters

##### resolution

`number`

The new resolution level. Must be a positive integer.

#### Returns

`void`

***

### version()

> **version**(): `string`

Defined in: [webdggrid.ts:324](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L324)

Returns the version string of the underlying DGGRID C++ library.

```ts
console.log(dggs.version()); // e.g. "8.3b"
```

#### Returns

`string`

The DGGRID C++ library version string.

***

### vertex2DDToSequenceNum()

> **vertex2DDToSequenceNum**(`keep`, `vertNum`, `triNum`, `x`, `y`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1190](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1190)

Convert VERTEX2DD (icosahedral vertex) coordinates to a SEQNUM cell ID.

```ts
const seqnum = dggs.vertex2DDToSequenceNum(true, 1, 1, 0.0625, 0.054, 5);
// seqnum = 100n
```

#### Parameters

##### keep

`boolean`

Whether to keep this vertex.

##### vertNum

`number`

Vertex number (0-11 for icosahedron).

##### triNum

`number`

Triangle number on the icosahedron.

##### x

`number`

X coordinate within the triangle.

##### y

`number`

Y coordinate within the triangle.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which to compute the cell ID. Defaults
  to the instance's current [resolution](#vertex2ddtosequencenum).

#### Returns

`bigint`

The sequence number (BigInt) of the cell containing this coordinate.

***

### z3ToSequenceNum()

> **z3ToSequenceNum**(`z3Value`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1373](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1373)

Convert a Z3 (base-3 Central Place Indexing) coordinate to a SEQNUM cell ID.

```ts
const seqnum = dggs.z3ToSequenceNum(1773292353277132799n, 5);
// seqnum = 100n
```

#### Parameters

##### z3Value

`bigint`

The Z3 coordinate value (BigInt, INT64 format).

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which to compute the cell ID. Defaults
  to the instance's current [resolution](#z3tosequencenum).

#### Returns

`bigint`

The sequence number (BigInt) corresponding to this Z3 value.

#### Throws

If used with an incompatible aperture (not 3) or topology.

***

### z7ToSequenceNum()

> **z7ToSequenceNum**(`z7Value`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1468](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1468)

Convert a Z7 (base-7 Central Place Indexing) coordinate to a SEQNUM cell ID.

```ts
const seqnum = dggs.z7ToSequenceNum(1153167795211468799n, 5);
// seqnum = 100n
```

#### Parameters

##### z7Value

`bigint`

The Z7 coordinate value (BigInt, INT64/hex format).

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which to compute the cell ID. Defaults
  to the instance's current [resolution](#z7tosequencenum).

#### Returns

`bigint`

The sequence number (BigInt) corresponding to this Z7 value.

#### Throws

If used with an incompatible aperture (not 7) or topology.

***

### zOrderToSequenceNum()

> **zOrderToSequenceNum**(`zorderValue`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1279](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L1279)

Convert a ZORDER (Z-order curve) coordinate to a SEQNUM cell ID.

```ts
const seqnum = dggs.zOrderToSequenceNum(1168684103302643712n, 5);
// seqnum = 100n
```

#### Parameters

##### zorderValue

`bigint`

The Z-order coordinate value (BigInt).

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which to compute the cell ID. Defaults
  to the instance's current [resolution](#zordertosequencenum).

#### Returns

`bigint`

The sequence number (BigInt) corresponding to this Z-order value.

#### Throws

If used with an incompatible aperture (7) or topology.

***

### load()

> `static` **load**(): `Promise`\<*typeof* `Webdggrid`\>

Defined in: [webdggrid.ts:298](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L298)

Compiles and instantiates the DGGRID WebAssembly module.

This is the only way to construct a `Webdggrid` instance. The method is
asynchronous because WebAssembly compilation is prohibited on the main
thread for buffers larger than 4 KB.

```ts
const dggs = await Webdggrid.load();
```

::: info
In general WebAssembly compilation is disallowed on the main thread if
the buffer size is larger than 4 KB, hence forcing `load` to be
asynchronous.
:::

#### Returns

`Promise`\<*typeof* `Webdggrid`\>

A promise that resolves to a fully initialised `Webdggrid` instance.

***

### unload()

> `static` **unload**(): `void`

Defined in: [webdggrid.ts:311](https://github.com/am2222/webDggrid/blob/16f19ca15fe4f253b39e62ee2d6a6a107f5964b9/src-ts/webdggrid.ts#L311)

Releases the compiled WASM instance and frees its memory.

Call this when your application no longer needs the library. After
calling `unload`, any existing `Webdggrid` instances become unusable —
you must call [load](#load) again to create a new one.

#### Returns

`void`
