[webdggrid](../globals.md) / Webdggrid

# Class: Webdggrid

Defined in: [webdggrid.ts:209](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L209)

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

Defined in: [webdggrid.ts:232](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L232)

***

### dggs

> **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

Defined in: [webdggrid.ts:218](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L218)

The active DGGS configuration used by all conversion and statistics
methods. Change it at any time via [setDggs](#setdggs).

Defaults to ISEA4H (ISEA projection, aperture 4, hexagon topology,
pole at 0° N 0° E, azimuth 0°).

***

### resolution

> **resolution**: `number` = `DEFAULT_RESOLUTION`

Defined in: [webdggrid.ts:230](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L230)

The active grid resolution. Higher values produce finer, smaller cells.
The valid range depends on the aperture — for aperture 4 the practical
limit is around resolution 15 before cell counts become unwieldy.

Change via [setResolution](#setresolution) or pass an explicit `resolution`
argument to any conversion method.

Defaults to `1`.

## Methods

### \_main()

> **\_main**(): `any`

Defined in: [webdggrid.ts:343](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L343)

**`Internal`**

Internal test helper that invokes the WASM module's `_main` entry point.
Not intended for production use.

#### Returns

`any`

***

### cellAreaKM()

> **cellAreaKM**(`resolution?`): `number`

Defined in: [webdggrid.ts:408](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L408)

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

Defined in: [webdggrid.ts:445](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L445)

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

Defined in: [webdggrid.ts:641](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L641)

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

### geoToSequenceNum()

> **geoToSequenceNum**(`coordinates`, `resolution?`): `bigint`[]

Defined in: [webdggrid.ts:534](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L534)

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

Defined in: [webdggrid.ts:319](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L319)

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

Defined in: [webdggrid.ts:483](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L483)

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

Defined in: [webdggrid.ts:371](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L371)

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

### sequenceNumToGeo()

> **sequenceNumToGeo**(`sequenceNum`, `resolution?`): `Position`[]

Defined in: [webdggrid.ts:582](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L582)

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

Defined in: [webdggrid.ts:700](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L700)

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

Defined in: [webdggrid.ts:792](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L792)

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

### setDggs()

> **setDggs**(`dggs?`, `resolution?`): `void`

Defined in: [webdggrid.ts:304](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L304)

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

Defined in: [webdggrid.ts:334](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L334)

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

Defined in: [webdggrid.ts:281](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L281)

Returns the version string of the underlying DGGRID C++ library.

```ts
console.log(dggs.version()); // e.g. "8.3b"
```

#### Returns

`string`

The DGGRID C++ library version string.

***

### load()

> `static` **load**(): `Promise`\<*typeof* `Webdggrid`\>

Defined in: [webdggrid.ts:255](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L255)

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

Defined in: [webdggrid.ts:268](https://github.com/am2222/webDggrid/blob/85c37bc633002c5c3eaac3cee47a75095b8b6854/src-ts/webdggrid.ts#L268)

Releases the compiled WASM instance and frees its memory.

Call this when your application no longer needs the library. After
calling `unload`, any existing `Webdggrid` instances become unusable —
you must call [load](#load) again to create a new one.

#### Returns

`void`
