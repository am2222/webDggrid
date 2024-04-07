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
    /**
     * Converts an array of geography coordinates to the list of the sequence numbers AKA DggId
     * @param coordinates A 2d array of [[lng, lat]] values
     * @param resolution  [resolution=DEFAULT_RESOLUTION] The dggs resolution
     * @returns An array of the DggIds
     */
    geoToSequenceNum(coordinates, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);
        const resultArray = this._module.DgGEO_to_SEQNUM(lat, lng, azimuth, aperture, resolution, topology, projection, xCoords, yCoords);
        return resultArray;
    }
    /**
     * Convert a sequence number to the [lng,lat] of the center of the related cell
     * @param sequenceNum
     * @param resolution  [resolution=DEFAULT_RESOLUTION]
     * @returns An array of [lng,lat]
     */
    sequenceNumToGeo(sequenceNum, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const resultArray = this._module.SEQNUM_to_GEO(lat, lng, azimuth, aperture, resolution, topology, projection, sequenceNum);
        const size = resultArray.length / 2;
        const arrayOfArrays = [];
        for (let i = 0; i < size; i += 1) {
            arrayOfArrays.push([resultArray[i], resultArray[i + size]]);
        }
        return arrayOfArrays;
    }
    /**
     * Converts a set of coordinates to the cell centroid values
     * @param coordinates A 2d array of lng and lat values
     * @param resolution  [resolution=DEFAULT_RESOLUTION] The resolution of the dggs
     * @returns An array of dggs cell centroid coordinates
     */
    geoToGeo(coordinates, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);
        const resultArray = this._module.GEO_to_GEO(lat, lng, azimuth, aperture, resolution, topology, projection, xCoords, yCoords);
        const size = resultArray.length / 2;
        const arrayOfArrays = [];
        for (let i = 0; i < size; i += 1) {
            arrayOfArrays.push([resultArray[i], resultArray[i + size]]);
        }
        return arrayOfArrays;
    }
    /**
     * Convert an array of sequence numbers to the grid coordinates with format of `[lng,lat]`. The output is an array with the same
     * size as input `sequenceNum` and it includes an array of `CoordinateLike` objects.
     * @param sequenceNum
     * @param resolution  [resolution=DEFAULT_RESOLUTION]
     * @returns An array of [lng,lat]
     */
    sequenceNumToGrid(sequenceNum, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        let resultArray = [];
        try {
            resultArray = this._module.SeqNumGrid(lat, lng, azimuth, aperture, resolution, topology, projection, sequenceNum);
        }
        catch (e) {
            throw (this._module.getExceptionMessage(e).toString());
        }
        const inputSize = sequenceNum.length;
        const allShapeVertexes = resultArray.slice(0, inputSize);
        const sumVertexes = allShapeVertexes.reduce((accumulator, currentValue) => {
            return accumulator + currentValue;
        }, 0);
        const featureSet = [];
        let xOffset = inputSize;
        let yOffset = inputSize + sumVertexes;
        for (let i = 0; i < allShapeVertexes.length; i += 1) {
            const numVertexes = allShapeVertexes[i];
            const currentShapeXVertexes = resultArray.slice(xOffset, xOffset + numVertexes);
            const currentShapeYVertexes = resultArray.slice(yOffset, yOffset + numVertexes);
            const coordinates = [];
            for (let i = 0; i < numVertexes; i += 1) {
                coordinates.push([currentShapeXVertexes[i], currentShapeYVertexes[i]]);
            }
            featureSet.push(coordinates);
            xOffset += numVertexes;
            yOffset += numVertexes;
        }
        return featureSet;
    }
    sequenceNumToGridFeatureCollection(sequenceNum, resolution = DEFAULT_RESOLUTION) {
        const coordinatesArray = this.sequenceNumToGrid(sequenceNum, resolution);
        const features = coordinatesArray.map((coordinates, index) => {
            const seqNum = sequenceNum[index];
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                },
                id: seqNum,
                properties: {
                    id: seqNum
                }
            };
        });
        return {
            type: 'FeatureCollection',
            features,
        };
    }
}
//# sourceMappingURL=webdggrid.js.map