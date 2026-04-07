## Web Assembly version of DGGRID

A WebAssembly wrapper for [DGGRID](https://github.com/sahrk/DGGRID), the C++ library for working with Discrete Global Grid Systems.


<div align="center">

[![NPM Version](https://img.shields.io/npm/v/webdggrid?style=flat-square)](https://www.npmjs.com/package/webdggrid)
[![GitHub Release](https://img.shields.io/github/v/release/am2222/webDggrid?style=flat-square)](https://github.com/am2222/webDggrid/releases/latest)
[![Docs](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/deploy-docs.yml?style=flat-square&label=docs)](https://am2222.github.io/webDggrid/)
[![PR Check](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/pr-check.yml?style=flat-square&label=pr%20check)](https://github.com/am2222/webDggrid/actions/workflows/pr-check.yml)
[![Publish](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/publish.yml?style=flat-square&label=publish)](https://github.com/am2222/webDggrid/actions/workflows/publish.yml)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/webdggrid/badge)](https://www.jsdelivr.com/package/npm/webdggrid)

</div>


<p align="center">
  <img src="https://raw.githubusercontent.com/am2222/webDggrid/main/media/screenshot.png" alt="Webdggrid demo screenshot"/>
</p>

------------

## Features

- 🚀 **WebAssembly Performance** - Full DGGRID C++ library compiled to WASM
- 🌐 **Browser & Node.js** - Works in any modern JavaScript environment
- 🔷 **Multiple Topologies** - HEXAGON, TRIANGLE, DIAMOND shapes supported
- 📐 **ISEA & FULLER** - Both projection systems available
- 🎯 **Multi-Aperture Grids** - Define custom aperture sequences (e.g., `"434747"`) for mixed refinement
- 🗺️ **GeoJSON Output** - Direct export to GeoJSON FeatureCollections
- 📊 **Grid Statistics** - Cell counts, areas, and spacing at any resolution

## How to use

Please check `tests` folder and [examples documentation](https://am2222.github.io/webDggrid/examples) for more examples.

in browser

```js

const WebdggridLocal = await import("../dist/index.js").then(m => m.Webdggrid).catch(console.log);
import { Webdggrid as WebdggridExternal } from "https://cdn.jsdelivr.net/npm/webDggrid/dist/index.js";

const Webdggrid = WebdggridLocal ?? WebdggridExternal;

const webdggrid = await Webdggrid.load();
const seqNum = dggs.geoToSequenceNum([[0, 0]]);

```

In nodejs

```js
import { Webdggrid } from 'webdggrid'
const dggs = await Webdggrid.load();
const seqNum = dggs.geoToSequenceNum([[0, 0]]);

```


## API

### Lifecycle
`Webdggrid.load` · `Webdggrid.unload`

### Configuration
`setDggs` · `getResolution` · `setResolution` · `version`

### Coordinate Conversion
`geoToSequenceNum` · `sequenceNumToGeo` · `geoToGeo` · `sequenceNumToGrid` · `sequenceNumToGridFeatureCollection`

### Grid Statistics
`nCells` · `cellAreaKM` · `cellDistKM` · `gridStatCLS`

### Hierarchical Operations
`sequenceNumNeighbors` · `sequenceNumParent` · `sequenceNumChildren`

### Hierarchical Address Types
`sequenceNumToVertex2DD` · `vertex2DDToSequenceNum` · `sequenceNumToZOrder` · `zOrderToSequenceNum` · `sequenceNumToZ3` · `z3ToSequenceNum` · `sequenceNumToZ7` · `z7ToSequenceNum`

### Index Digit Manipulation
`z7GetQuad` · `z7GetDigit` · `z7SetDigit` · `z7ExtractDigits` · `z3GetQuad` · `z3GetDigit` · `z3SetDigit` · `z3ExtractDigits` · `zOrderGetQuad` · `zOrderGetDigit` · `zOrderSetDigit` · `zOrderExtractDigits`

### Low-Level Coordinate Systems
`geoToPlane` · `geoToProjtri` · `geoToQ2dd` · `geoToQ2di` · `sequenceNumToPlane` · `sequenceNumToProjtri` · `sequenceNumToQ2dd` · `sequenceNumToQ2di`

### Q2DI Conversions
`q2diToGeo` · `q2diToSequenceNum` · `q2diToPlane` · `q2diToProjtri` · `q2diToQ2dd`

### Q2DD Conversions
`q2ddToGeo` · `q2ddToSequenceNum` · `q2ddToPlane` · `q2ddToProjtri` · `q2ddToQ2di`

### PROJTRI Conversions
`projtriToGeo` · `projtriToSequenceNum` · `projtriToPlane` · `projtriToQ2dd` · `projtriToQ2di`

### Multi-Aperture Support

```javascript
// Configure a grid with mixed apertures
dggs.setDggs({
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    apertureSequence: "434747",  // Custom aperture per resolution
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
}, 5);
```

See the [full API reference](https://am2222.github.io/webDggrid/api/) and [examples](https://am2222.github.io/webDggrid/examples) for details.

## Contributing & Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, project structure, and commit conventions.

## Changes

See [CHANGELOG.md](CHANGELOG.md) for the full history.
