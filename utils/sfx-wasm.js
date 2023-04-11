import fs from 'fs';
import { Zstd } from '@hpcc-js/wasm/zstd';
import { Base91 } from '@hpcc-js/wasm/base91';

const wasmPath ='./lib-wasm/libdggrid.wasm';

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
    fs.writeFileSync('./lib-esm/libdggrid.wasm.js', content);
} else {
    throw new Error(' filePath  is required.');
}
