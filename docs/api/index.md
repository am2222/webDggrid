## Web Assembly version of DGGRID

<div align="center">

![NPM Version](https://img.shields.io/npm/v/webdggrid?style=flat-square)
 ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/deploy.yml?style=flat-square&label=docs) ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/am2222/webDggrid/main.yml?style=flat-square&label=npm%20pacakge) [![](https://data.jsdelivr.com/v1/package/npm/webdggrid/badge)](https://www.jsdelivr.com/package/npm/webdggrid)

</div>

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

### Under development
