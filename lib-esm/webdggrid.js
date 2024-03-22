// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';
/**
 * Cell Topology
 *
 * @export
 * @enum {String}
 */
export var Topology;
(function (Topology) {
    Topology["HEXAGON"] = "HEXAGON";
    Topology["TRIANGLE"] = "TRIANGLE";
    Topology["SQUARE"] = "SQUARE";
    Topology["DIAMOND"] = "DIAMOND";
})(Topology || (Topology = {}));
/**
 * Projection type
 *
 * @export
 * @enum {number}
 */
export var Projection;
(function (Projection) {
    Projection["ISEA"] = "ISEA";
    Projection["FULLER"] = "FULLER";
})(Projection || (Projection = {}));
const DEFAULT_RESOLUTION = 1;
const DEFAULT_DGGS = {
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    aperture: 7
};
export class Webdggrid {
    constructor(_module) {
        this._module = _module;
        this.dggs = DEFAULT_DGGS;
        this.resolution = DEFAULT_RESOLUTION;
        this._wVectorToArray = (vector) => {
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
    version() {
        return this._module.Webdggrid.prototype.version();
    }
    /**
     * Set the main dggs configuration
     * @param dggs A dggs object
     */
    setDggs(dggs = DEFAULT_DGGS, resolution = DEFAULT_RESOLUTION) {
        this.dggs = dggs;
        this.resolution = resolution;
    }
    /**
     * Get the resolution of the current dggs
     * @returns {number} the current dggs resolution
     * @memberof WebDggrid
     */
    getResolution() {
        return this.resolution;
    }
    /**
     * Set the resolution of the dggs
     * @param {number} [resolution=DEFAULT_RESOLUTION] the resolution. It should be a valid integer
     * @memberof WebDggrid
     */
    setResolution(resolution) {
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
    nCells(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.nCells(lat, lng, azimuth, aperture, resolution, topology, projection);
        return cellCount;
    }
    cellAreaKM(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.nCells(lat, lng, azimuth, aperture, resolution, topology, projection);
        return cellCount;
    }
    cellDistKM(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.nCells(lat, lng, azimuth, aperture, resolution, topology, projection);
        return cellCount;
    }
    gridStatCLS(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.nCells(lat, lng, azimuth, aperture, resolution, topology, projection);
        return cellCount;
    }
    geoToSequenceNum(coordinates, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);
        const resultArray = this._module.DgGEO_to_SEQNUM(lat, lng, azimuth, aperture, resolution, topology, projection, xCoords, yCoords);
        return resultArray;
    }
    sequenceNumToGeo(sequenceNum, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const resultArray = this._module.SEQNUM_to_GEO(lat, lng, azimuth, aperture, resolution, topology, projection, sequenceNum);
        return resultArray;
    }
    _is2dArray(array) { return array.some((item) => Array.isArray(item)); }
    _arrayToVector(array) {
        const is2d = this._is2dArray(array);
        if (is2d) {
            const dDVector = new this._module.DoubleVectorVector();
            array.forEach((item) => {
                const dVector = new this._module.DoubleVector();
                dVector.push_back(item[0]);
                dVector.push_back(item[1]);
                dDVector.push_back(dVector);
            });
            return dDVector;
        }
    }
    _vectorToArray(vector) { return new Array(vector.size()).fill(0).map((_, id) => vector.get(id)); }
}
//# sourceMappingURL=webdggrid.js.map