# Getting Started

## Installation

```bash
npm install webdggrid
# or
yarn add webdggrid
```

## Browser (ES Module)

```js
import { Webdggrid } from 'https://cdn.jsdelivr.net/npm/webdggrid/dist/index.js';

const dggs = await Webdggrid.load();
```

## Node.js

```js
import { Webdggrid } from 'webdggrid';

const dggs = await Webdggrid.load();
```

## Basic Usage

### Convert coordinates to cell IDs

```js
// coordinates are [lng, lat] pairs
const seqNums = dggs.geoToSequenceNum([[0, 0], [-73.9, 40.7]], 3);
console.log(seqNums); // [1n, 42n, ...]
```

### Get cell center from ID

```js
const centers = dggs.sequenceNumToGeo([1n, 2n], 3);
// [[lng, lat], [lng, lat]]
```

### Get grid polygons as GeoJSON

```js
const seqNums = dggs.geoToSequenceNum([[0, 0]], 5);
const geojson = dggs.sequenceNumToGridFeatureCollection(seqNums, 5);
// Standard GeoJSON FeatureCollection — ready for Leaflet, MapLibre, deck.gl, etc.
```

### Configure the grid system

```js
// Standard single-aperture grid
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: 'HEXAGON',
  projection: 'ISEA',
  aperture: 4,
}, /* resolution */ 3);

// Multi-aperture grid (NEW!)
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: 'HEXAGON',
  projection: 'ISEA',
  apertureSequence: "434747",  // Different aperture per resolution
}, /* resolution */ 5);
```

See the [multi-aperture documentation](multi-aperture.md) for more details.

## Grid Statistics

```js
const cellCount = dggs.nCells(3);       // total cells at resolution 3
const areakm    = dggs.cellAreaKM(3);   // average cell area in km²
const distkm    = dggs.cellDistKM(3);   // average cell spacing in km
```

## Live Demo

- [Globe Demo](/demo) — interactive MapLibre globe with topology switching, multi-aperture grids, and hierarchical cell selection
- [Hierarchical Operations Demo](/hierarchical-operations#interactive-demo) — explore parent, children, and neighbor relationships
- [Address Types Demo](/hierarchical-addresses#interactive-demo) — compare index types and see bitwise digit breakdowns
- [Index Arithmetic Demo](/index-arithmetic#interactive-demo) — live demonstration of digit manipulation on Z3, Z7, and ZORDER indices

## API Overview

### Lifecycle

| Method | Description |
|--------|-------------|
| [`Webdggrid.load()`](api/classes/Webdggrid.md#load) | Compile and instantiate the WASM module |
| [`Webdggrid.unload()`](api/classes/Webdggrid.md#unload) | Free WASM memory |

### Configuration

| Method | Description |
|--------|-------------|
| [`setDggs()`](api/classes/Webdggrid.md#setdggs) | Configure grid projection, aperture, topology, and resolution |
| [`getResolution()`](api/classes/Webdggrid.md#getresolution) | Get current resolution |
| [`setResolution()`](api/classes/Webdggrid.md#setresolution) | Set current resolution |
| [`version()`](api/classes/Webdggrid.md#version) | Get DGGRID version string |

### Coordinate Conversion

| Method | Description |
|--------|-------------|
| [`geoToSequenceNum()`](api/classes/Webdggrid.md#geotosequencenum) | Convert [lng, lat] points to cell IDs |
| [`sequenceNumToGeo()`](api/classes/Webdggrid.md#sequencenumtogeo) | Convert cell IDs to [lng, lat] centers |
| [`geoToGeo()`](api/classes/Webdggrid.md#geotogeo) | Snap [lng, lat] points to cell centers |
| [`sequenceNumToGrid()`](api/classes/Webdggrid.md#sequencenumtogrid) | Get polygon rings for cell IDs |
| [`sequenceNumToGridFeatureCollection()`](api/classes/Webdggrid.md#sequencenumtogridfeaturecollection) | Get GeoJSON FeatureCollection for cell IDs |

### Grid Statistics

| Method | Description |
|--------|-------------|
| [`nCells()`](api/classes/Webdggrid.md#ncells) | Total cell count at a resolution |
| [`cellAreaKM()`](api/classes/Webdggrid.md#cellareakm) | Average cell area in km² |
| [`cellDistKM()`](api/classes/Webdggrid.md#celldistkm) | Average cell spacing in km |
| [`gridStatCLS()`](api/classes/Webdggrid.md#gridstatcls) | Characteristic length scale |

### Hierarchical Operations

| Method | Description |
|--------|-------------|
| [`sequenceNumNeighbors()`](api/classes/Webdggrid.md#sequencenumneighbors) | Find edge-sharing neighbor cells |
| [`sequenceNumParent()`](api/classes/Webdggrid.md#sequencenumparent) | Get primary (containing) parent at coarser resolution |
| [`sequenceNumAllParents()`](api/classes/Webdggrid.md#sequencenumallparents) | Get all touching parent cells (primary first) |
| [`sequenceNumChildren()`](api/classes/Webdggrid.md#sequencenumchildren) | Get child cells at finer resolution |

### Hierarchical Address Types

| Method | Description |
|--------|-------------|
| [`sequenceNumToVertex2DD()`](api/classes/Webdggrid.md#sequencenumtovertex2dd) | SEQNUM → VERTEX2DD (all apertures) |
| [`vertex2DDToSequenceNum()`](api/classes/Webdggrid.md#vertex2ddtosequencenum) | VERTEX2DD → SEQNUM |
| [`sequenceNumToZOrder()`](api/classes/Webdggrid.md#sequencenumtozorder) | SEQNUM → ZORDER (aperture 3, 4) |
| [`zOrderToSequenceNum()`](api/classes/Webdggrid.md#zordertosequencenum) | ZORDER → SEQNUM |
| [`sequenceNumToZ3()`](api/classes/Webdggrid.md#sequencenumtoz3) | SEQNUM → Z3 (aperture 3 hexagons) |
| [`z3ToSequenceNum()`](api/classes/Webdggrid.md#z3tosequencenum) | Z3 → SEQNUM |
| [`sequenceNumToZ7()`](api/classes/Webdggrid.md#sequencenumtoz7) | SEQNUM → Z7 (aperture 7 hexagons) |
| [`z7ToSequenceNum()`](api/classes/Webdggrid.md#z7tosequencenum) | Z7 → SEQNUM |

### Index Digit Manipulation

| Method | Description |
|--------|-------------|
| [`z7GetQuad()`](api/classes/Webdggrid.md#z7getquad) | Get quad (icosahedron face) from Z7 index |
| [`z7GetDigit()`](api/classes/Webdggrid.md#z7getdigit) | Read digit at resolution level from Z7 index |
| [`z7SetDigit()`](api/classes/Webdggrid.md#z7setdigit) | Write digit at resolution level in Z7 index |
| [`z7ExtractDigits()`](api/classes/Webdggrid.md#z7extractdigits) | Extract quad + all digits from Z7 index |
| [`z3GetQuad()`](api/classes/Webdggrid.md#z3getquad) | Get quad from Z3 index |
| [`z3GetDigit()`](api/classes/Webdggrid.md#z3getdigit) | Read digit at resolution level from Z3 index |
| [`z3SetDigit()`](api/classes/Webdggrid.md#z3setdigit) | Write digit at resolution level in Z3 index |
| [`z3ExtractDigits()`](api/classes/Webdggrid.md#z3extractdigits) | Extract quad + all digits from Z3 index |
| [`zOrderGetQuad()`](api/classes/Webdggrid.md#zordergetquad) | Get quad from ZORDER index |
| [`zOrderGetDigit()`](api/classes/Webdggrid.md#zordergetdigit) | Read digit at resolution level from ZORDER index |
| [`zOrderSetDigit()`](api/classes/Webdggrid.md#zordersetdigit) | Write digit at resolution level in ZORDER index |
| [`zOrderExtractDigits()`](api/classes/Webdggrid.md#zorderextractdigits) | Extract quad + all digits from ZORDER index |

### Low-Level Coordinate Systems

| Method | Description |
|--------|-------------|
| [`geoToPlane()`](api/classes/Webdggrid.md#geotoplane) | Geographic → PLANE |
| [`geoToProjtri()`](api/classes/Webdggrid.md#geotoprojtri) | Geographic → PROJTRI |
| [`geoToQ2dd()`](api/classes/Webdggrid.md#geotoq2dd) | Geographic → Q2DD |
| [`geoToQ2di()`](api/classes/Webdggrid.md#geotoq2di) | Geographic → Q2DI |
| [`sequenceNumToPlane()`](api/classes/Webdggrid.md#sequencenumtoplane) | SEQNUM → PLANE |
| [`sequenceNumToProjtri()`](api/classes/Webdggrid.md#sequencenumtoprojtri) | SEQNUM → PROJTRI |
| [`sequenceNumToQ2dd()`](api/classes/Webdggrid.md#sequencenumtoq2dd) | SEQNUM → Q2DD |
| [`sequenceNumToQ2di()`](api/classes/Webdggrid.md#sequencenumtoq2di) | SEQNUM → Q2DI |

### Q2DI Conversions

| Method | Description |
|--------|-------------|
| [`q2diToGeo()`](api/classes/Webdggrid.md#q2ditogeo) | Q2DI → Geographic |
| [`q2diToSequenceNum()`](api/classes/Webdggrid.md#q2ditosequencenum) | Q2DI → SEQNUM |
| [`q2diToPlane()`](api/classes/Webdggrid.md#q2ditoplane) | Q2DI → PLANE |
| [`q2diToProjtri()`](api/classes/Webdggrid.md#q2ditoprojtri) | Q2DI → PROJTRI |
| [`q2diToQ2dd()`](api/classes/Webdggrid.md#q2ditoq2dd) | Q2DI → Q2DD |

### Q2DD Conversions

| Method | Description |
|--------|-------------|
| [`q2ddToGeo()`](api/classes/Webdggrid.md#q2ddtogeo) | Q2DD → Geographic |
| [`q2ddToSequenceNum()`](api/classes/Webdggrid.md#q2ddtosequencenum) | Q2DD → SEQNUM |
| [`q2ddToPlane()`](api/classes/Webdggrid.md#q2ddtoplane) | Q2DD → PLANE |
| [`q2ddToProjtri()`](api/classes/Webdggrid.md#q2ddtoprojtri) | Q2DD → PROJTRI |
| [`q2ddToQ2di()`](api/classes/Webdggrid.md#q2ddtoq2di) | Q2DD → Q2DI |

### PROJTRI Conversions

| Method | Description |
|--------|-------------|
| [`projtriToGeo()`](api/classes/Webdggrid.md#projtritogeo) | PROJTRI → Geographic |
| [`projtriToSequenceNum()`](api/classes/Webdggrid.md#projtritosequencenum) | PROJTRI → SEQNUM |
| [`projtriToPlane()`](api/classes/Webdggrid.md#projtritoplane) | PROJTRI → PLANE |
| [`projtriToQ2dd()`](api/classes/Webdggrid.md#projtritoq2dd) | PROJTRI → Q2DD |
| [`projtriToQ2di()`](api/classes/Webdggrid.md#projtritoq2di) | PROJTRI → Q2DI |

For full parameter details and examples, see the [complete API reference](api/classes/Webdggrid.md).

## Examples

More examples can be found in the test suite:

- [geo.test.ts](https://github.com/am2222/webDggrid/blob/main/tests/unit/geo.test.ts) — Basic grid operations
- [transforms.test.ts](https://github.com/am2222/webDggrid/blob/main/tests/unit/transforms.test.ts) — Coordinate transformations
- [hierarchy.test.ts](https://github.com/am2222/webDggrid/blob/main/tests/unit/hierarchy.test.ts) — Parent, children, neighbors
- [hierarchical-addresses.test.ts](https://github.com/am2222/webDggrid/blob/main/tests/unit/hierarchical-addresses.test.ts) — VERTEX2DD, ZORDER, Z3, Z7
- [index-digits.test.ts](https://github.com/am2222/webDggrid/blob/main/tests/unit/index-digits.test.ts) — Index digit manipulation
- [multi-aperture.test.ts](https://github.com/am2222/webDggrid/blob/main/tests/unit/multi-aperture.test.ts) — Multi-aperture grids
