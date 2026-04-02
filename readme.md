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

## How to use

Please check `tests` folder for more examples.

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

`setDggs` · `getResolution` · `setResolution` · `geoToSequenceNum` · `sequenceNumToGeo` · `sequenceNumToGrid` · `sequenceNumToGridFeatureCollection` · `geoToGeo` · `cellAreaKM` · `cellDistKM` · `nCells`

See the [full API reference](https://am2222.github.io/webDggrid/api/) for details and type signatures.

## Contributing & Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, project structure, and commit conventions.

## Changes

See [CHANGELOG.md](CHANGELOG.md) for the full history.
