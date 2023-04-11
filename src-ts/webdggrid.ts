// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';

export class Webdggrid {

    private constructor(protected _module: any) {
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
    static load(): Promise<Webdggrid> {
        return loadWasm().then((module: any) => {
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
    version(): string {
        return this._module.Webdggrid.prototype.version();
    }
}
