export declare class Webdggrid {
    protected _module: any;
    private constructor();
    /**
     * Compiles and instantiates the raw wasm.
     *
     * ::: info
     * In general WebAssembly compilation is disallowed on the main thread if the buffer size is larger than 4KB, hence forcing `load` to be asynchronous;
     * :::
     *
     * @returns A promise to an instance of the Webdggrid class.
     */
    static load(): Promise<Webdggrid>;
    /**
     * Unloades the compiled wasm instance.
     */
    static unload(): void;
    /**
     * @returns The Webdggrid c++ version
     */
    version(): string;
}
//# sourceMappingURL=webdggrid.d.ts.map