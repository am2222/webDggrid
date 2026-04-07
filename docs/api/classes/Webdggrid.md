[webdggrid](../globals.md) / Webdggrid

# Class: Webdggrid

Defined in: [webdggrid.ts:252](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L252)

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

Defined in: [webdggrid.ts:275](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L275)

***

### dggs

> **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

Defined in: [webdggrid.ts:261](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L261)

The active DGGS configuration used by all conversion and statistics
methods. Change it at any time via [setDggs](#setdggs).

Defaults to ISEA4H (ISEA projection, aperture 4, hexagon topology,
pole at 0° N 0° E, azimuth 0°).

***

### resolution

> **resolution**: `number` = `DEFAULT_RESOLUTION`

Defined in: [webdggrid.ts:273](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L273)

The active grid resolution. Higher values produce finer, smaller cells.
The valid range depends on the aperture — for aperture 4 the practical
limit is around resolution 15 before cell counts become unwieldy.

Change via [setResolution](#setresolution) or pass an explicit `resolution`
argument to any conversion method.

Defaults to `1`.

***

### Z3\_BITS\_PER\_DIGIT

> `readonly` `static` **Z3\_BITS\_PER\_DIGIT**: `2n` = `2n`

Defined in: [webdggrid.ts:1571](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1571)

**`Internal`**

***

### Z3\_DIGIT\_MASK

> `readonly` `static` **Z3\_DIGIT\_MASK**: `3n` = `3n`

Defined in: [webdggrid.ts:1572](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1572)

**`Internal`**

***

### Z3\_MAX\_RES

> `readonly` `static` **Z3\_MAX\_RES**: `30` = `30`

Defined in: [webdggrid.ts:1570](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1570)

**`Internal`**

***

### Z3\_QUAD\_MASK

> `readonly` `static` **Z3\_QUAD\_MASK**: `17293822569102704640n` = `0xF000000000000000n`

Defined in: [webdggrid.ts:1574](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1574)

**`Internal`**

***

### Z3\_QUAD\_OFFSET

> `readonly` `static` **Z3\_QUAD\_OFFSET**: `60n` = `60n`

Defined in: [webdggrid.ts:1573](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1573)

**`Internal`**

***

### Z7\_BITS\_PER\_DIGIT

> `readonly` `static` **Z7\_BITS\_PER\_DIGIT**: `3n` = `3n`

Defined in: [webdggrid.ts:1564](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1564)

**`Internal`**

***

### Z7\_DIGIT\_MASK

> `readonly` `static` **Z7\_DIGIT\_MASK**: `7n` = `7n`

Defined in: [webdggrid.ts:1565](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1565)

**`Internal`**

***

### Z7\_MAX\_RES

> `readonly` `static` **Z7\_MAX\_RES**: `20` = `20`

Defined in: [webdggrid.ts:1563](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1563)

**`Internal`**

***

### Z7\_QUAD\_MASK

> `readonly` `static` **Z7\_QUAD\_MASK**: `17293822569102704640n` = `0xF000000000000000n`

Defined in: [webdggrid.ts:1567](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1567)

**`Internal`**

***

### Z7\_QUAD\_OFFSET

> `readonly` `static` **Z7\_QUAD\_OFFSET**: `60n` = `60n`

Defined in: [webdggrid.ts:1566](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1566)

**`Internal`**

***

### ZORDER\_BITS\_PER\_DIGIT

> `readonly` `static` **ZORDER\_BITS\_PER\_DIGIT**: `2n` = `2n`

Defined in: [webdggrid.ts:1578](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1578)

**`Internal`**

***

### ZORDER\_DIGIT\_MASK

> `readonly` `static` **ZORDER\_DIGIT\_MASK**: `3n` = `3n`

Defined in: [webdggrid.ts:1579](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1579)

**`Internal`**

***

### ZORDER\_MAX\_RES

> `readonly` `static` **ZORDER\_MAX\_RES**: `30` = `30`

Defined in: [webdggrid.ts:1577](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1577)

**`Internal`**

***

### ZORDER\_QUAD\_MASK

> `readonly` `static` **ZORDER\_QUAD\_MASK**: `17293822569102704640n` = `0xF000000000000000n`

Defined in: [webdggrid.ts:1581](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1581)

**`Internal`**

***

### ZORDER\_QUAD\_OFFSET

> `readonly` `static` **ZORDER\_QUAD\_OFFSET**: `60n` = `60n`

Defined in: [webdggrid.ts:1580](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1580)

**`Internal`**

## Methods

### \_main()

> **\_main**(): `any`

Defined in: [webdggrid.ts:386](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L386)

**`Internal`**

Internal test helper that invokes the WASM module's `_main` entry point.
Not intended for production use.

#### Returns

`any`

***

### cellAreaKM()

> **cellAreaKM**(`resolution?`): `number`

Defined in: [webdggrid.ts:457](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L457)

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

Defined in: [webdggrid.ts:500](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L500)

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

Defined in: [webdggrid.ts:720](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L720)

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

Defined in: [webdggrid.ts:1845](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1845)

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

Defined in: [webdggrid.ts:1866](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1866)

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

Defined in: [webdggrid.ts:1891](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1891)

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

Defined in: [webdggrid.ts:1916](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1916)

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

Defined in: [webdggrid.ts:601](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L601)

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

Defined in: [webdggrid.ts:362](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L362)

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

Defined in: [webdggrid.ts:544](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L544)

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

Defined in: [webdggrid.ts:414](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L414)

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

Defined in: [webdggrid.ts:2263](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2263)

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

Defined in: [webdggrid.ts:2300](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2300)

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

Defined in: [webdggrid.ts:2322](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2322)

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

Defined in: [webdggrid.ts:2348](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2348)

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

Defined in: [webdggrid.ts:2285](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2285)

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

Defined in: [webdggrid.ts:2148](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2148)

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

Defined in: [webdggrid.ts:2185](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2185)

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

Defined in: [webdggrid.ts:2207](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2207)

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

Defined in: [webdggrid.ts:2233](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2233)

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

Defined in: [webdggrid.ts:2170](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2170)

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

Defined in: [webdggrid.ts:2033](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2033)

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

Defined in: [webdggrid.ts:2070](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2070)

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

Defined in: [webdggrid.ts:2092](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2092)

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

Defined in: [webdggrid.ts:2118](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2118)

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

Defined in: [webdggrid.ts:2055](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2055)

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

### sequenceNumAllParents()

> **sequenceNumAllParents**(`sequenceNum`, `resolution?`): `bigint`[][]

Defined in: [webdggrid.ts:1082](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1082)

Returns **all** parent cells that touch each input cell at the coarser
resolution (resolution - 1).

Unlike [sequenceNumParent](#sequencenumparent) which returns only the primary
(containing) parent, this method returns every parent cell whose area
overlaps with the child cell. For interior cells this is typically 1;
for cells on a parent boundary it may be 2 or more.

The **first element** of each inner array is always the primary
(containing) parent — the same value returned by
[sequenceNumParent](#sequencenumparent).

```ts
const allParents = dggs.sequenceNumAllParents([256n], 3);
// allParents[0] = [65n, 66n]  — 65 is the containing parent,
//                               66 is a touching neighbor parent
```

#### Parameters

##### sequenceNum

`bigint`[]

Array of `BigInt` cell IDs to query.

##### resolution?

`number` = `DEFAULT_RESOLUTION`

Resolution at which the input IDs were generated
  (must be > 0). Defaults to the instance's current [resolution](#sequencenumallparents).

#### Returns

`bigint`[][]

A 2-D array: `result[i]` contains all parent cell IDs that
  touch `sequenceNum[i]`, with the primary parent first.

#### Throws

If `resolution` is 0 or negative, or if an invalid cell ID is
  provided.

***

### sequenceNumChildren()

> **sequenceNumChildren**(`sequenceNum`, `resolution?`): `bigint`[][]

Defined in: [webdggrid.ts:1142](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1142)

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

Defined in: [webdggrid.ts:935](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L935)

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

Defined in: [webdggrid.ts:1014](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1014)

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

Defined in: [webdggrid.ts:655](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L655)

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

Defined in: [webdggrid.ts:785](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L785)

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

Defined in: [webdggrid.ts:880](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L880)

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

Defined in: [webdggrid.ts:1945](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1945)

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

Defined in: [webdggrid.ts:1963](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1963)

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

Defined in: [webdggrid.ts:1985](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1985)

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

Defined in: [webdggrid.ts:2007](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L2007)

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

Defined in: [webdggrid.ts:1214](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1214)

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

Defined in: [webdggrid.ts:1386](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1386)

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

Defined in: [webdggrid.ts:1481](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1481)

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

Defined in: [webdggrid.ts:1291](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1291)

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

Defined in: [webdggrid.ts:347](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L347)

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

Defined in: [webdggrid.ts:377](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L377)

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

Defined in: [webdggrid.ts:324](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L324)

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

Defined in: [webdggrid.ts:1247](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1247)

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

### z3ExtractDigits()

> **z3ExtractDigits**(`z3Value`, `resolution`): `object`

Defined in: [webdggrid.ts:1720](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1720)

Extract all digits from a Z3 index up to a given resolution.

```ts
const { quad, digits } = dggs.z3ExtractDigits(z3Value, 5);
// quad: 1, digits: [1, 0, 2, 1, 0]
```

#### Parameters

##### z3Value

`bigint`

A Z3 packed index (BigInt).

##### resolution

`number`

Number of digits to extract (1-based).

#### Returns

`object`

Object with `quad` (number) and `digits` (number array).

##### digits

> **digits**: `number`[]

##### quad

> **quad**: `number`

***

### z3GetDigit()

> **z3GetDigit**(`z3Value`, `res`): `number`

Defined in: [webdggrid.ts:1686](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1686)

Get the digit at a specific resolution level from a Z3 index.

Each digit is 2 bits wide. Valid digits are 0–2; the value 3 is the
invalid/padding marker.

```ts
const digit = dggs.z3GetDigit(z3Value, 3); // 0–2 (or 3 = invalid)
```

#### Parameters

##### z3Value

`bigint`

A Z3 packed index (BigInt).

##### res

`number`

Resolution level (1-based, 1 to 30).

#### Returns

`number`

The digit value (0–3).

***

### z3GetQuad()

> **z3GetQuad**(`z3Value`): `number`

Defined in: [webdggrid.ts:1668](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1668)

Get the quad (icosahedron face) number from a Z3 index.

```ts
const quad = dggs.z3GetQuad(z3Value); // 0–11
```

#### Parameters

##### z3Value

`bigint`

A Z3 packed index (BigInt).

#### Returns

`number`

The quad number (0–11).

***

### z3SetDigit()

> **z3SetDigit**(`z3Value`, `res`, `digit`): `bigint`

Defined in: [webdggrid.ts:1703](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1703)

Set the digit at a specific resolution level in a Z3 index.

```ts
const child = dggs.z3SetDigit(z3Value, 6, 1); // set res-6 digit to 1
```

#### Parameters

##### z3Value

`bigint`

A Z3 packed index (BigInt).

##### res

`number`

Resolution level (1-based, 1 to 30).

##### digit

`number`

The digit value to set (0–2, or 3 for invalid).

#### Returns

`bigint`

A new Z3 value with the digit replaced.

***

### z3ToSequenceNum()

> **z3ToSequenceNum**(`z3Value`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1430](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1430)

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

### z7ExtractDigits()

> **z7ExtractDigits**(`z7Value`, `resolution`): `object`

Defined in: [webdggrid.ts:1649](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1649)

Extract all digits from a Z7 index up to a given resolution.

```ts
const { quad, digits } = dggs.z7ExtractDigits(z7Value, 5);
// quad: 1, digits: [2, 0, 3, 4, 1]
```

#### Parameters

##### z7Value

`bigint`

A Z7 packed index (BigInt).

##### resolution

`number`

Number of digits to extract (1-based).

#### Returns

`object`

Object with `quad` (number) and `digits` (number array).

##### digits

> **digits**: `number`[]

##### quad

> **quad**: `number`

***

### z7GetDigit()

> **z7GetDigit**(`z7Value`, `res`): `number`

Defined in: [webdggrid.ts:1613](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1613)

Get the digit at a specific resolution level from a Z7 index.

Each digit is 3 bits wide and occupies a fixed position in the 64-bit value.
Valid digits are 0–6; the value 7 is the invalid/padding marker.

```ts
const digit = dggs.z7GetDigit(z7Value, 3); // 0–6 (or 7 = invalid)
```

#### Parameters

##### z7Value

`bigint`

A Z7 packed index (BigInt).

##### res

`number`

Resolution level (1-based, 1 to 20).

#### Returns

`number`

The digit value (0–7).

***

### z7GetQuad()

> **z7GetQuad**(`z7Value`): `number`

Defined in: [webdggrid.ts:1595](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1595)

Get the quad (icosahedron face) number from a Z7 index.

The quad occupies bits 63–60 of the 64-bit packed value.

```ts
const quad = dggs.z7GetQuad(z7Value); // 0–11
```

#### Parameters

##### z7Value

`bigint`

A Z7 packed index (BigInt).

#### Returns

`number`

The quad number (0–11).

***

### z7SetDigit()

> **z7SetDigit**(`z7Value`, `res`, `digit`): `bigint`

Defined in: [webdggrid.ts:1632](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1632)

Set the digit at a specific resolution level in a Z7 index.

Returns a new Z7 value with the digit at position `res` replaced.

```ts
const child = dggs.z7SetDigit(z7Value, 6, 3); // set res-6 digit to 3
```

#### Parameters

##### z7Value

`bigint`

A Z7 packed index (BigInt).

##### res

`number`

Resolution level (1-based, 1 to 20).

##### digit

`number`

The digit value to set (0–6, or 7 for invalid).

#### Returns

`bigint`

A new Z7 value with the digit replaced.

***

### z7ToSequenceNum()

> **z7ToSequenceNum**(`z7Value`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1525](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1525)

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

### zOrderExtractDigits()

> **zOrderExtractDigits**(`zorderValue`, `resolution`): `object`

Defined in: [webdggrid.ts:1790](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1790)

Extract all digits from a ZORDER index up to a given resolution.

```ts
const { quad, digits } = dggs.zOrderExtractDigits(zorderValue, 5);
// quad: 1, digits: [2, 0, 3, 1, 0]
```

#### Parameters

##### zorderValue

`bigint`

A ZORDER packed index (BigInt).

##### resolution

`number`

Number of digits to extract (1-based).

#### Returns

`object`

Object with `quad` (number) and `digits` (number array).

##### digits

> **digits**: `number`[]

##### quad

> **quad**: `number`

***

### zOrderGetDigit()

> **zOrderGetDigit**(`zorderValue`, `res`): `number`

Defined in: [webdggrid.ts:1756](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1756)

Get the digit at a specific resolution level from a ZORDER index.

Each digit is 2 bits wide (values 0–3).

```ts
const digit = dggs.zOrderGetDigit(zorderValue, 3); // 0–3
```

#### Parameters

##### zorderValue

`bigint`

A ZORDER packed index (BigInt).

##### res

`number`

Resolution level (1-based, 1 to 30).

#### Returns

`number`

The digit value (0–3).

***

### zOrderGetQuad()

> **zOrderGetQuad**(`zorderValue`): `number`

Defined in: [webdggrid.ts:1739](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1739)

Get the quad (icosahedron face) number from a ZORDER index.

```ts
const quad = dggs.zOrderGetQuad(zorderValue); // 0–11
```

#### Parameters

##### zorderValue

`bigint`

A ZORDER packed index (BigInt).

#### Returns

`number`

The quad number (0–11).

***

### zOrderSetDigit()

> **zOrderSetDigit**(`zorderValue`, `res`, `digit`): `bigint`

Defined in: [webdggrid.ts:1773](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1773)

Set the digit at a specific resolution level in a ZORDER index.

```ts
const modified = dggs.zOrderSetDigit(zorderValue, 3, 2);
```

#### Parameters

##### zorderValue

`bigint`

A ZORDER packed index (BigInt).

##### res

`number`

Resolution level (1-based, 1 to 30).

##### digit

`number`

The digit value to set (0–3).

#### Returns

`bigint`

A new ZORDER value with the digit replaced.

***

### zOrderToSequenceNum()

> **zOrderToSequenceNum**(`zorderValue`, `resolution?`): `bigint`

Defined in: [webdggrid.ts:1336](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L1336)

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

Defined in: [webdggrid.ts:298](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L298)

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

Defined in: [webdggrid.ts:311](https://github.com/am2222/webDggrid/blob/3579dfb7e3c2bffc807aae448b47bef20e7b9865/src-ts/webdggrid.ts#L311)

Releases the compiled WASM instance and frees its memory.

Call this when your application no longer needs the library. After
calling `unload`, any existing `Webdggrid` instances become unusable —
you must call [load](#load) again to create a new one.

#### Returns

`void`
