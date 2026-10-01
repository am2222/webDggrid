import fs from 'fs';
import { Zstd } from '@hpcc-js/wasm/zstd';
import { Base91 } from '@hpcc-js/wasm/base91';

const wasmPath ='./lib-wasm/libdggrid.wasm';
const gluePath = wasmPath.replace('.wasm', '.js');

// The package embeds the WASM and passes it as `wasmBinary`, so the glue never
// fetches libdggrid.wasm. Emscripten's ES6 glue still contains a
// `new URL("libdggrid.wasm", import.meta.url)` locator, which bundlers resolve
// as an asset at build time and cannot find because the file is not published.
// Use Emscripten's own `locateFile` fallback instead so no asset reference remains.
const glue = fs.readFileSync(gluePath, 'utf8').replace(
    /new URL\((["'])libdggrid\.wasm\1,\s*import\.meta\.url\)\.href/g,
    'locateFile("libdggrid.wasm")'
);
if (/new URL\([^)]*libdggrid\.wasm/.test(glue)) {
    throw new Error(`Unrecognized WASM URL locator in ${gluePath}; update sfx-wasm.js for the current Emscripten glue.`);
}
fs.writeFileSync(gluePath, glue);

let wasmContent;
if (fs.existsSync(wasmPath)) {
    wasmContent = fs.readFileSync(wasmPath);
}
if (wasmContent) {
    const zstd = await Zstd.load();
    const compressed = zstd.compress(new Uint8Array(wasmContent));
    const base91 = await Base91.load();
    const str = base91.encode(compressed);

    const content = `import { extract } from './extract.js';
import wrapper from '.${wasmPath.replace('.wasm', '.js')}';

const blobStr = '${str}';

let g_module;
let g_wasmBinary;
export function loadWasm() {
    if (!g_wasmBinary) {
        g_wasmBinary = extract(blobStr);
    }
    if (!g_module) {
        g_module = wrapper({
            wasmBinary: g_wasmBinary,
        });
    }
    return g_module;
}

export function unloadWasm() {
    if (g_module) {
        g_module = undefined;
    }
}
`;
    fs.mkdirSync('./lib-esm', { recursive: true });
    fs.writeFileSync('./lib-esm/libdggrid.wasm.js', content);
} else {
    throw new Error(' filePath  is required.');
}
