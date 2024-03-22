// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';

/**
 * Cell Topology
 *
 * @export
 * @enum {String}
 */
export enum Topology {
    'HEXAGON' = 'HEXAGON',
    'TRIANGLE' = 'TRIANGLE',
    'SQUARE' = 'SQUARE',
    'DIAMOND' = 'DIAMOND',
}
/**
 * Projection type
 *
 * @export
 * @enum {number}
 */
export enum Projection {
    'ISEA' = 'ISEA',
    'FULLER' = 'FULLER',
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

const DEFAULT_RESOLUTION = 1;
const DEFAULT_DGGS = {
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    aperture: 7
} as IDGGSProps;

export class Webdggrid {

    dggs: IDGGSProps = DEFAULT_DGGS;
    resolution: number = DEFAULT_RESOLUTION;

    private constructor(protected _module: any) {
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
    static load(): Promise<typeof Webdggrid> {
        return loadWasm().then((module: any) => {
            return new Webdggrid(module);
        }).catch(console.log);
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

    /**
     * Set the main dggs configuration
     * @param dggs A dggs object
     */
    setDggs(dggs: IDGGSProps = DEFAULT_DGGS, resolution: number = DEFAULT_RESOLUTION) {
        this.dggs = dggs;
        this.resolution = resolution;
    }

    /**
     * Get the resolution of the current dggs
     * @returns {number} the current dggs resolution
     * @memberof WebDggrid
     */
    getResolution(): number {
        return this.resolution;
    }
    /**
     * Set the resolution of the dggs
     * @param {number} [resolution=DEFAULT_RESOLUTION] the resolution. It should be a valid integer
     * @memberof WebDggrid
     */
    setResolution(resolution: number) {
        this.resolution = resolution;
    }

    /**
     * test function
     *
     * @return {*} 
     * @memberof WebDggrid
     */
    _main() {
        return this._module._main();
    }

    /**
     * @follow Hi
     * Returns the number of the cells in specific resolution 
     * @param {number} [resolution=DEFAULT_RESOLUTION]
     * @return {number}  
     * @memberof WebDggrid
     */
    nCells(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.nCells(
            lat,
            lng,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    cellAreaKM(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.nCells(
            lat,
            lng,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    cellDistKM(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.nCells(
            lat,
            lng,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    gridStatCLS(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.nCells(
            lat,
            lng,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    geoToSequenceNum(
        coordinates: number[][],
        resolution: number = DEFAULT_RESOLUTION
    ): bigint[] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const xCoords= coordinates.map((coord)=>coord[0]);
        const yCoords= coordinates.map((coord)=>coord[1]);

        const resultArray = this._module.DgGEO_to_SEQNUM(
            lat,
            lng,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            xCoords,
            yCoords
        );

        return resultArray;
    }
    /**
     * Convert a sequence number to the [lng,lat] of the center of the related cell
     * @param sequenceNum 
     * @param resolution  [resolution=DEFAULT_RESOLUTION]
     * @returns An array of [lng,lat]
     */
    sequenceNumToGeo(
        sequenceNum: bigint[],
        resolution: number = DEFAULT_RESOLUTION
    ): number[][] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const resultArray = this._module.SEQNUM_to_GEO(
            lat,
            lng,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            sequenceNum
        );

        return resultArray;
    }

    _is2dArray(array: any): boolean { return array.some((item: any) => Array.isArray(item)); }

    _arrayToVector(array: any) {
        const is2d = this._is2dArray(array);
        if (is2d) {
            const dDVector = new this._module.DoubleVectorVector();
            array.forEach((item: any) => {
                const dVector = new this._module.DoubleVector();
                dVector.push_back(item[0]);
                dVector.push_back(item[1]);
                dDVector.push_back(dVector);
            });
            return dDVector;
        }
    }
    _vectorToArray(vector: any) { return new Array(vector.size()).fill(0).map((_, id) => vector.get(id)); }

    _wVectorToArray = (vector: any) => {
        if (vector.size() === 0) {
            return [];
        }

        const objectType = vector.$$.ptrType.name;

        switch (objectType) {
            case 'BigIntegerVector*':
                return this._vectorToArray(vector);

            default:
                return [];
        }
    };

    // _extractColumn(arr: any, column: number) { return arr.map((x: any) => x[column]); }
}
