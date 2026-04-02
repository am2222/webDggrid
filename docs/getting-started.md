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
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: 'HEXAGON',
  projection: 'ISEA',
  aperture: 4,
}, /* resolution */ 3);
```

## Grid Statistics

```js
const cellCount = dggs.nCells(3);       // total cells at resolution 3
const areakm    = dggs.cellAreaKM(3);   // average cell area in km²
const distkm    = dggs.cellDistKM(3);   // average cell spacing in km
```

## Live Demo

See the [interactive globe demo](/example.html) for a full example using MapLibre GL JS with a globe projection.

---

## Geometry Notes

### Pentagon cells

Every hexagonal DGGS tessellation of a sphere must contain exactly **12 pentagonal cells** — a mathematical consequence of Euler's formula for polyhedra. These pentagons sit at the 12 vertices of the underlying icosahedron.

At low resolutions (e.g. resolution 1 with 42 total cells) you will encounter them frequently. A pentagon ring has 5 unique vertices plus a closing repeat (6 total), rather than the 7 of a hexagon. This is **correct and expected** — not a bug.

```js
const fc = dggs.sequenceNumToGridFeatureCollection([1n], 1);
const ring = fc.features[0].geometry.coordinates[0];
// ring.length === 6 → pentagon (5 unique + 1 closing vertex)
// ring.length === 7 → hexagon (6 unique + 1 closing vertex)
```

---

### Antimeridian handling

Cells that straddle the ±180° meridian need special treatment. webdggrid outputs **standard GeoJSON** with all longitudes in `[-180, 180]`, which is correct for most consumers (Leaflet, Turf.js, PostGIS, etc.).

For **MapLibre GL JS / Mapbox GL JS with a globe projection**, polygon edges between a vertex at e.g. `170°` and one at `-170°` will be drawn the wrong way around the globe unless you shift the negative longitude into extended range (i.e. `-170°` → `190°`). webdggrid exports `unwrapAntimeridianRing` for exactly this purpose, and applies it automatically inside `sequenceNumToGridFeatureCollection`.

```js
import { Webdggrid, unwrapAntimeridianRing } from 'webdggrid';

// sequenceNumToGridFeatureCollection already applies unwrapAntimeridianRing
// internally, so it works out of the box with MapLibre globe.
const fc = dggs.sequenceNumToGridFeatureCollection(seqNums, resolution);
map.getSource('dggrid').setData(fc);

// If you use sequenceNumToGrid directly and need extended coordinates:
const rings = dggs.sequenceNumToGrid(seqNums, resolution);
const corrected = rings.map(unwrapAntimeridianRing);
```

For renderers that **require strictly valid GeoJSON** (`[-180, 180]`), use the raw output of `sequenceNumToGrid` and handle antimeridian splitting yourself (e.g. with [Turf.js `booleanCrossesAntimeridian`](https://turfjs.org/)).

| Consumer | What to use |
|---|---|
| MapLibre GL / Mapbox GL globe | `sequenceNumToGridFeatureCollection` (built-in) |
| Leaflet, OpenLayers, D3 | `sequenceNumToGrid` — raw `[-180, 180]` |
| Turf.js / PostGIS | `sequenceNumToGrid` — raw `[-180, 180]` |
