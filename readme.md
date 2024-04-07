## Web Assembly version of DGGRID

A wrapper for DGGRID in Web Assembly. Based on last DGGRID c++ library developed by Dr. Kevin


<div align="center">

![NPM Version](https://img.shields.io/npm/v/webdggrid?style=flat-square)
 ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/deploy.yml?style=flat-square&label=docs) ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/main.yml?style=flat-square&label=npm%20pacakge) [![](https://data.jsdelivr.com/v1/package/npm/webdggrid/badge)](https://www.jsdelivr.com/package/npm/webdggrid)

</div>

<p align="center">
  <img src="https://github.com/am2222/pydggrid/blob/master/docs/L6kmP.jpg?raw=true" alt="SPyDGGRID"/>
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


## Supported Functions

**Grid Creation**

- [setDggs](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#setDggs)
- [getResolution](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#getResolution)
- [setResolution](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#setResolution)

**Grid Statistics**

- [cellAreaKM](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#cellAreaKM)
- [cellDistKM](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#cellDistKM)
- [nCells](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#nCells)

**Grid Conversions**

- [geoToGeo](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#geoToGeo)
- [geoToSequenceNum](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#geoToSequenceNum)
- [sequenceNumToGeo](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#sequenceNumToGeo)
- [sequenceNumToGridFeatureCollection](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#sequenceNumToGridFeatureCollection)
- [sequenceNumToGrid](https://am2222.github.io/webDggrid/api/classes/Webdggrid.html#sequenceNumToGrid)

## Changes

Slow development pace.

**1.0.5**

- Added support to `SeqNumGrid`

## Development

Make sure to setup `emscripten` on your machine.

The development process involves modifying the `cpp` code and use `utils/make.js` to build the library.

| Folder   |      Desc       |
|----------|:-------------:|
| src-cpp|  The src file of the DGGRID. It is inspired from DGGRIDR project.|
| src-ts|  The src file js wrapper around the `emscripten` code to make it easier to interact with library in more `js` friendly approach.|
| lib-wasm |    The js output that `emscripten` generates    |
| lib-wasm-py | experimental python wrapper  |
| tests| JS unit tests  |

To build the entire library simply run
``yarn build``

It will build webassembly file and also builds the typescript wrapper.

### Server the emscripten output [just for development purpuse]

Run the following command. It will open the emscripten's default page to test the wasm file. Just navigate to `libdggrid.html`
 `
yarn serve
 `

 you can invoke the functions similar to

 ```
Module.DgGEO_to_SEQNUM(0,0,0,4,10,'HEXAGON','ISEA',[0],[0])
 ``
