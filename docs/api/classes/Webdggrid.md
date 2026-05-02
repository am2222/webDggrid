[webdggrid](../globals.md) / Webdggrid

# Class: Webdggrid

Defined in: [webdggrid.ts:262](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L262)

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

Defined in: [webdggrid.ts:285](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L285)

***

### dggs

> **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

Defined in: [webdggrid.ts:271](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L271)

The active DGGS configuration used by all conversion and statistics
methods. Change it at any time via [setDggs](#setdggs).

Defaults to ISEA4H (ISEA projection, aperture 4, hexagon topology,
pole at 0° N 0° E, azimuth 0°).

***

### resolution

> **resolution**: `number` = `DEFAULT_RESOLUTION`

Defined in: [webdggrid.ts:283](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L283)

The active grid resolution. Higher values produce finer, smaller cells.
The valid range depends on the aperture — for aperture 4 the practical
limit is around resolution 15 before cell counts become unwieldy.

Change via [setResolution](#setresolution) or pass an explicit `resolution`
argument to any conversion method.

Defaults to `1`.

***

### Z3\_BITS\_PER\_DIGIT

> `readonly` `static` **Z3\_BITS\_PER\_DIGIT**: `2n` = `2n`

Defined in: [webdggrid.ts:1594](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1594)

**`Internal`**

***

### Z3\_DIGIT\_MASK

> `readonly` `static` **Z3\_DIGIT\_MASK**: `3n` = `3n`

Defined in: [webdggrid.ts:1595](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1595)

**`Internal`**

***

### Z3\_MAX\_RES

> `readonly` `static` **Z3\_MAX\_RES**: `30` = `30`

Defined in: [webdggrid.ts:1593](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1593)

**`Internal`**

***

### Z3\_QUAD\_MASK

> `readonly` `static` **Z3\_QUAD\_MASK**: `17293822569102704640n` = `0xF000000000000000n`

Defined in: [webdggrid.ts:1597](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1597)

**`Internal`**

***

### Z3\_QUAD\_OFFSET

> `readonly` `static` **Z3\_QUAD\_OFFSET**: `60n` = `60n`

Defined in: [webdggrid.ts:1596](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1596)

**`Internal`**

***

### Z7\_BITS\_PER\_DIGIT

> `readonly` `static` **Z7\_BITS\_PER\_DIGIT**: `3n` = `3n`

Defined in: [webdggrid.ts:1587](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1587)

**`Internal`**

***

### Z7\_DIGIT\_MASK

> `readonly` `static` **Z7\_DIGIT\_MASK**: `7n` = `7n`

Defined in: [webdggrid.ts:1588](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1588)

**`Internal`**

***

### Z7\_MAX\_RES

> `readonly` `static` **Z7\_MAX\_RES**: `20` = `20`

Defined in: [webdggrid.ts:1586](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1586)

**`Internal`**

***

### Z7\_QUAD\_MASK

> `readonly` `static` **Z7\_QUAD\_MASK**: `17293822569102704640n` = `0xF000000000000000n`

Defined in: [webdggrid.ts:1590](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1590)

**`Internal`**

***

### Z7\_QUAD\_OFFSET

> `readonly` `static` **Z7\_QUAD\_OFFSET**: `60n` = `60n`

Defined in: [webdggrid.ts:1589](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1589)

**`Internal`**

***

### ZORDER\_BITS\_PER\_DIGIT

> `readonly` `static` **ZORDER\_BITS\_PER\_DIGIT**: `2n` = `2n`

Defined in: [webdggrid.ts:1601](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1601)

**`Internal`**

***

### ZORDER\_DIGIT\_MASK

> `readonly` `static` **ZORDER\_DIGIT\_MASK**: `3n` = `3n`

Defined in: [webdggrid.ts:1602](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1602)

**`Internal`**

***

### ZORDER\_MAX\_RES

> `readonly` `static` **ZORDER\_MAX\_RES**: `30` = `30`

Defined in: [webdggrid.ts:1600](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1600)

**`Internal`**

***

### ZORDER\_QUAD\_MASK

> `readonly` `static` **ZORDER\_QUAD\_MASK**: `17293822569102704640n` = `0xF000000000000000n`

Defined in: [webdggrid.ts:1604](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1604)

**`Internal`**

***

### ZORDER\_QUAD\_OFFSET

> `readonly` `static` **ZORDER\_QUAD\_OFFSET**: `60n` = `60n`

Defined in: [webdggrid.ts:1603](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1603)

**`Internal`**

## Methods

### \_main()

> **\_main**(): `any`

Defined in: [webdggrid.ts:396](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L396)

**`Internal`**

Internal test helper that invokes the WASM module's `_main` entry point.
Not intended for production use.

#### Returns

`any`

***

### cellAreaKM()

> **cellAreaKM**(`resolution?`): `number`

Defined in: [webdggrid.ts:467](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L467)

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

Defined in: [webdggrid.ts:510](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L510)

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

Defined in: [webdggrid.ts:730](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L730)

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

Defined in: [webdggrid.ts:1868](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1868)

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

Defined in: [webdggrid.ts:1889](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1889)

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

Defined in: [webdggrid.ts:1914](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1914)

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

Defined in: [webdggrid.ts:1939](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1939)

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

Defined in: [webdggrid.ts:611](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L611)

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

Defined in: [webdggrid.ts:372](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L372)

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

Defined in: [webdggrid.ts:554](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L554)

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

### igeo7AuthalicToGeo()

> **igeo7AuthalicToGeo**(`latDeg`): `number`

Defined in: [webdggrid.ts:2641](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2641)

Inverse of [igeo7GeoToAuthalic](#igeo7geotoauthalic) — convert an authalic latitude
back to geodetic.

#### Parameters

##### latDeg

`number`

Authalic latitude in degrees.

#### Returns

`number`

Geodetic latitude (WGS84) in degrees.

***

### igeo7Encode()

> **igeo7Encode**(`base`, `digits`): `bigint`

Defined in: [webdggrid.ts:2481](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2481)

Pack a base cell and exactly 20 digit slots into a 64-bit Z7 index.

Use digit value `7` for every slot beyond the desired resolution.
Field values are masked internally — no range-check is required.

```ts
// Reconstruct '0800432' — base=8, resolution=5
const idx = dggs.igeo7Encode(
  8, [0,0,4,3,2, 7,7,7,7,7, 7,7,7,7,7, 7,7,7,7,7]
);
// idx === dggs.igeo7FromString('0800432')
```

#### Parameters

##### base

`number`

Base cell (0-11).

##### digits

`number`[]

Exactly 20 digit values (0-7 each).

#### Returns

`bigint`

Packed Z7 index as BigInt.

#### Throws

If `digits.length !== 20`.

***

### igeo7FirstNonZero()

> **igeo7FirstNonZero**(`index`): `number`

Defined in: [webdggrid.ts:2606](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2606)

Position (1-20) of the first non-zero digit slot in a Z7 index.
Returns `0` when no non-zero digit exists (centre of the base cell).

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`number`

Position of first non-zero digit, or 0.

***

### igeo7FromString()

> **igeo7FromString**(`s`): `bigint`

Defined in: [webdggrid.ts:2441](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2441)

Parse a Z7 compact string into a packed 64-bit index.

```ts
const idx = dggs.igeo7FromString('0800432');
// idx is a BigInt packed index for base=8, digits=[0,0,4,3,2], res=5
```

#### Parameters

##### s

`string`

Compact Z7 string (2-digit base + digit characters).

#### Returns

`bigint`

Packed index as BigInt (unsigned).

***

### igeo7GeoToAuthalic()

> **igeo7GeoToAuthalic**(`latDeg`): `number`

Defined in: [webdggrid.ts:2630](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2630)

Convert a geodetic latitude (WGS84 ellipsoid) to its authalic latitude
on the equal-area sphere. Implementation follows Karney (2022) — same
polynomial used by the `igeo7_geo_to_authalic` DuckDB scalar function.

Longitude is unaffected; only latitude is transformed.

#### Parameters

##### latDeg

`number`

Geodetic latitude in degrees, range `[-90, 90]`.

#### Returns

`number`

Authalic latitude in degrees.

***

### igeo7GetBaseCell()

> **igeo7GetBaseCell**(`index`): `number`

Defined in: [webdggrid.ts:2510](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2510)

Extract the base cell (0-11) of a packed Z7 index.

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`number`

Base cell ID.

***

### igeo7GetDigit()

> **igeo7GetDigit**(`index`, `position`): `number`

Defined in: [webdggrid.ts:2522](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2522)

Extract the `i`-th digit (1-20) of a packed Z7 index.
Positions outside `[1, 20]` return `7` (matches DuckDB extension).

#### Parameters

##### index

`bigint`

Packed Z7 index.

##### position

`number`

Digit position, 1-based.

#### Returns

`number`

Digit value (0-7).

***

### igeo7GetResolution()

> **igeo7GetResolution**(`index`): `number`

Defined in: [webdggrid.ts:2500](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2500)

Extract the resolution (0-20) of a packed Z7 index.

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`number`

Resolution level.

***

### igeo7IsValid()

> **igeo7IsValid**(`index`): `boolean`

Defined in: [webdggrid.ts:2616](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2616)

Whether a packed Z7 index is valid (i.e. not the `UINT64_MAX` sentinel).

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`boolean`

`true` if valid, `false` for the invalid sentinel.

***

### igeo7Neighbour()

> **igeo7Neighbour**(`index`, `direction`): `bigint`

Defined in: [webdggrid.ts:2595](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2595)

Single neighbour of a Z7 cell by GBT direction (1-6).

Returns the invalid sentinel (`UINT64_MAX`) when `direction` is outside
`[1, 6]` or when the requested neighbour is excluded (pentagons).

#### Parameters

##### index

`bigint`

Packed Z7 index.

##### direction

`number`

Direction number, 1-6.

#### Returns

`bigint`

Neighbour index as BigInt.

***

### igeo7Neighbours()

> **igeo7Neighbours**(`index`): `bigint`[]

Defined in: [webdggrid.ts:2580](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2580)

Return all 6 neighbour indices of a Z7 cell, in GBT directions 1-6.

Invalid neighbours (e.g. one direction on the 12 pentagons) are the
sentinel `UINT64_MAX` (`0xFFFFFFFFFFFFFFFFn`). Use [igeo7IsValid](#igeo7isvalid)
to filter them out.

```ts
const cell = dggs.igeo7FromString('0800432');
const ns = dggs.igeo7Neighbours(cell)
  .filter(n => dggs.igeo7IsValid(n))
  .map(n => dggs.igeo7ToString(n));
```

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`bigint`[]

Array of exactly 6 BigInt neighbour indices.

***

### igeo7Parent()

> **igeo7Parent**(`index`): `bigint`

Defined in: [webdggrid.ts:2540](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2540)

Parent of a Z7 cell — one hierarchy level up.

At resolution 0 the cell is its own parent (the result has resolution 0
and the same base cell).

```ts
const child = dggs.igeo7FromString('0800432');
dggs.igeo7ToString(dggs.igeo7Parent(child)); // '080043'
```

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`bigint`

Parent index as BigInt.

***

### igeo7ParentAt()

> **igeo7ParentAt**(`index`, `resolution`): `bigint`

Defined in: [webdggrid.ts:2559](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2559)

Ancestor of a Z7 cell at a specific resolution.

Keeps digits `1..resolution` and fills the remainder with padding
(`7`). The argument is clamped to `[0, 20]`.

```ts
const cell = dggs.igeo7FromString('0800432');
dggs.igeo7ToString(dggs.igeo7ParentAt(cell, 3)); // '08004'
```

#### Parameters

##### index

`bigint`

Packed Z7 index.

##### resolution

`number`

Target resolution (0-20).

#### Returns

`bigint`

Ancestor index as BigInt.

***

### igeo7ToString()

> **igeo7ToString**(`index`): `string`

Defined in: [webdggrid.ts:2458](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2458)

Render a packed Z7 index as its compact string form.

Stops at the first padding digit (value 7), producing a string whose
length reflects the cell's resolution (`2 + resolution` characters).

```ts
dggs.igeo7ToString(dggs.igeo7FromString('0800432')); // '0800432'
```

#### Parameters

##### index

`bigint`

Packed Z7 index.

#### Returns

`string`

Compact Z7 string.

***

### igeo7TransformGeoJson()

> **igeo7TransformGeoJson**\<`T`\>(`input`, `direction?`): `T`

Defined in: [webdggrid.ts:2659](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2659)

Apply [igeo7GeoToAuthalic](#igeo7geotoauthalic) (or its inverse) to every coordinate of
a GeoJSON geometry, feature, or feature collection. Mirrors the
`igeo7_geo_to_authalic` / `igeo7_authalic_to_geo` DuckDB functions
(which take/return `GEOMETRY`); this is the WASM equivalent for
GeoJSON-shaped inputs.

The input is **deep-cloned** — the source object is not mutated.
Geometries with `null` or unsupported types are returned unchanged.

#### Type Parameters

##### T

`T` *extends* `GeoJSON`

#### Parameters

##### input

`T`

Any GeoJSON geometry, feature, or feature collection.

##### direction?

`"geoToAuthalic"` \| `"authalicToGeo"`

`'geoToAuthalic'` (default) or `'authalicToGeo'`.

#### Returns

`T`

A new GeoJSON object of the same shape with transformed lats.

***

### nCells()

> **nCells**(`resolution?`): `number`

Defined in: [webdggrid.ts:424](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L424)

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

Defined in: [webdggrid.ts:2286](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2286)

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

Defined in: [webdggrid.ts:2323](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2323)

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

Defined in: [webdggrid.ts:2345](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2345)

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

Defined in: [webdggrid.ts:2371](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2371)

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

Defined in: [webdggrid.ts:2308](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2308)

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

Defined in: [webdggrid.ts:2171](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2171)

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

Defined in: [webdggrid.ts:2208](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2208)

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

Defined in: [webdggrid.ts:2230](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2230)

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

Defined in: [webdggrid.ts:2256](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2256)

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

Defined in: [webdggrid.ts:2193](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2193)

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

Defined in: [webdggrid.ts:2056](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2056)

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

Defined in: [webdggrid.ts:2093](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2093)

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

Defined in: [webdggrid.ts:2115](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2115)

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

Defined in: [webdggrid.ts:2141](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2141)

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

Defined in: [webdggrid.ts:2078](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2078)

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

Defined in: [webdggrid.ts:1105](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1105)

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

Defined in: [webdggrid.ts:1165](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1165)

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

Defined in: [webdggrid.ts:958](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L958)

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

Defined in: [webdggrid.ts:1037](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1037)

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

Defined in: [webdggrid.ts:665](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L665)

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

> **sequenceNumToGrid**(`sequenceNum`, `resolution?`, `unwrap?`): `Position`[][]

Defined in: [webdggrid.ts:803](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L803)

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

##### unwrap?

`boolean` = `true`

When `true` (default), antimeridian-crossing rings are
  passed through [unwrapAntimeridianRing](../functions/unwrapAntimeridianRing.md) so longitudes stay
  contiguous (lons may exceed 180°). Required by MapLibre GL / Mapbox
  GL globe projection. Set to `false` to receive the raw DGGRID output
  in `[-180, 180]` — required by Cesium's `GeoJsonDataSource` (which
  internally normalises lons and breaks polar caps under unwrap), and
  by any sphere-aware renderer that interpolates edges as great-circle
  arcs.

#### Returns

`Position`[][]

A 2-D array: `result[i]` is the vertex ring of `sequenceNum[i]`.
  Each vertex is a `[lng, lat]` position.

#### Throws

If the WASM module encounters an invalid cell ID.

***

### sequenceNumToGridFeatureCollection()

> **sequenceNumToGridFeatureCollection**(`sequenceNum`, `resolution?`, `unwrap?`): `FeatureCollection`\<`Polygon`, `object` & `object`\>

Defined in: [webdggrid.ts:902](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L902)

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

##### unwrap?

`boolean` = `true`

Forwarded to [sequenceNumToGrid](#sequencenumtogrid). Defaults to
  `true` (MapLibre-style unwrap). Pass `false` for Cesium and other
  great-circle-arc renderers.

#### Returns

`FeatureCollection`\<`Polygon`, `object` & `object`\>

A GeoJSON `FeatureCollection` of `Polygon` features, one per
  input cell ID.

***

### sequenceNumToPlane()

> **sequenceNumToPlane**(`sequenceNum`, `resolution?`): `object`[]

Defined in: [webdggrid.ts:1968](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1968)

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

Defined in: [webdggrid.ts:1986](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1986)

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

Defined in: [webdggrid.ts:2008](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2008)

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

Defined in: [webdggrid.ts:2030](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L2030)

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

Defined in: [webdggrid.ts:1237](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1237)

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

Defined in: [webdggrid.ts:1409](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1409)

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

Defined in: [webdggrid.ts:1504](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1504)

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

Defined in: [webdggrid.ts:1314](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1314)

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

Defined in: [webdggrid.ts:357](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L357)

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

Defined in: [webdggrid.ts:387](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L387)

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

Defined in: [webdggrid.ts:334](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L334)

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

Defined in: [webdggrid.ts:1270](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1270)

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

Defined in: [webdggrid.ts:1743](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1743)

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

Defined in: [webdggrid.ts:1709](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1709)

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

Defined in: [webdggrid.ts:1691](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1691)

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

Defined in: [webdggrid.ts:1726](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1726)

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

Defined in: [webdggrid.ts:1453](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1453)

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

Defined in: [webdggrid.ts:1672](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1672)

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

Defined in: [webdggrid.ts:1636](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1636)

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

Defined in: [webdggrid.ts:1618](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1618)

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

Defined in: [webdggrid.ts:1655](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1655)

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

Defined in: [webdggrid.ts:1548](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1548)

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

Defined in: [webdggrid.ts:1813](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1813)

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

Defined in: [webdggrid.ts:1779](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1779)

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

Defined in: [webdggrid.ts:1762](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1762)

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

Defined in: [webdggrid.ts:1796](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1796)

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

Defined in: [webdggrid.ts:1359](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L1359)

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

Defined in: [webdggrid.ts:308](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L308)

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

Defined in: [webdggrid.ts:321](https://github.com/am2222/webDggrid/blob/62544b244ecf036037149f81bc90e0fa7718511e/src-ts/webdggrid.ts#L321)

Releases the compiled WASM instance and frees its memory.

Call this when your application no longer needs the library. After
calling `unload`, any existing `Webdggrid` instances become unusable —
you must call [load](#load) again to create a new one.

#### Returns

`void`
