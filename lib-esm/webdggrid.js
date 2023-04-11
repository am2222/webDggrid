// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';
export class Webdggrid {
    constructor(_module) {
        this._module = _module;
    }
    /**
     * Compiles and instantiates the raw wasm.
     *
     * ::: info
     * In general WebAssembly compilation is disallowed on the main thread if the buffer size is larger than 4KB, hence forcing `load` to be asynchronous;
     * :::
     *
     * @returns A promise to an instance of the Webdggrid class.
     */
    static load() {
        return loadWasm().then((module) => {
            return new Webdggrid(module);
        });
    }
    /**
     * Unloades the compiled wasm instance.
     */
    static unload() {
        unloadWasm();
    }
    /**
     * @returns The Webdggrid c++ version
     */
    version() {
        return this._module.Webdggrid.prototype.version();
    }
}
//# sourceMappingURL=webdggrid.js.map