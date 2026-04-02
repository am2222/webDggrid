## Web Assembly version of DGGRID

A wrapper for DGGRID in Web Assembly. Based on last DGGRID c++ library developed by Dr. Kevin


<div align="center">

[![NPM Version](https://img.shields.io/npm/v/webdggrid?style=flat-square)](https://www.npmjs.com/package/webdggrid)
[![Docs](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/deploy.yml?style=flat-square&label=docs)](https://am2222.github.io/webDggrid/)
[![CI](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/pr-check.yml?style=flat-square&label=ci)](https://github.com/am2222/webDggrid/actions/workflows/pr-check.yml)
[![npm package](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/publish.yml?style=flat-square&label=publish)](https://github.com/am2222/webDggrid/actions/workflows/publish.yml)
[![](https://data.jsdelivr.com/v1/package/npm/webdggrid/badge)](https://www.jsdelivr.com/package/npm/webdggrid)

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
