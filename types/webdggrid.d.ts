/**
 * Cell Topology
 *
 * @export
 * @enum {String}
 */
export declare enum Topology {
    'HEXAGON' = "HEXAGON",
    'TRIANGLE' = "TRIANGLE",
    'SQUARE' = "SQUARE",
    'DIAMOND' = "DIAMOND"
}
/**
 * Projection type
 *
 * @export
 * @enum {number}
 */
export declare enum Projection {
    'ISEA' = "ISEA",
    'FULLER' = "FULLER"
}
export interface Coordinate {
    lat: number;
    lng: number;
}
export interface IDGGSProps {
    poleCoordinates: Coordinate;
    azimuth: number;
    aperture: 3 | 4 | 5 | 7;
    topology: Topology;
    projection: Projection;
}
export declare class Webdggrid {
    protected _module: any;
    dggs: IDGGSProps;
    resolution: number;
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
    static load(): Promise<typeof Webdggrid>;
    /**
     * Unloades the compiled wasm instance.
     */
    static unload(): void;
    /**
     * @returns The Webdggrid c++ version
     */
    version(): string;
    /**
     * Set the main dggs configuration
     * @param dggs A dggs object
     */
    setDggs(dggs?: IDGGSProps, resolution?: number): void;
    /**
     * Get the resolution of the current dggs
     * @returns {number} the current dggs resolution
     * @memberof WebDggrid
     */
    getResolution(): number;
    /**
     * Set the resolution of the dggs
     * @param {number} [resolution=DEFAULT_RESOLUTION] the resolution. It should be a valid integer
     * @memberof WebDggrid
     */
    setResolution(resolution: number): void;
    /**
     * test function
     *
     * @return {*}
     * @memberof WebDggrid
     */
    _main(): any;
    /**
     * @follow Hi
     * Returns the number of the cells in specific resolution
     * @param {number} [resolution=DEFAULT_RESOLUTION]
     * @return {number}
     * @memberof WebDggrid
     */
    nCells(resolution?: number): number;
    cellAreaKM(resolution?: number): number;
    cellDistKM(resolution?: number): number;
    gridStatCLS(resolution?: number): number;
    geoToSequenceNum(coordinates: number[][], resolution?: number): bigint[];
    sequenceNumToGeo(sequenceNum: bigint[], resolution?: number): number[][];
    _is2dArray(array: any): boolean;
    _arrayToVector(array: any): any;
    _vectorToArray(vector: any): any[];
    _wVectorToArray: (vector: any) => any[];
}
//# sourceMappingURL=webdggrid.d.ts.map