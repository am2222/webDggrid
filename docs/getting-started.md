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
