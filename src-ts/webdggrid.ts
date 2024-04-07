// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';
import { Feature, FeatureCollection, GeoJsonProperties, Polygon, Position } from 'geojson';
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

/**
 * A geographic coordinate
 */
export interface Coordinate {
    lat: number;
    lng: number;
}

/**
 * Geojson properties type.
 * TODO: Better handeling the types
 */
export type DGGSGeoJsonProperty = GeoJsonProperties & {
    /**
     * It stores the seq number if exists
     */
    id?: BigInt;
    i?: BigInt;
    j?: BigInt;
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
    /**
     * Converts an array of geography coordinates to the list of the sequence numbers AKA DggId
     * @param coordinates A 2d array of [[lng, lat]] values
     * @param resolution  [resolution=DEFAULT_RESOLUTION] The dggs resolution
     * @returns An array of the DggIds 
     */
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

        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);

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
    ): Position[] {
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

        const size = resultArray.length / 2;
        const arrayOfArrays: number[][] = [];
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
    geoToGeo(
        coordinates: number[][],
        resolution: number = DEFAULT_RESOLUTION
    ): Position[] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);

        const resultArray = this._module.GEO_to_GEO(
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

        const size = resultArray.length / 2;
        const arrayOfArrays: number[][] = [];
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
    sequenceNumToGrid(
        sequenceNum: bigint[],
        resolution: number = DEFAULT_RESOLUTION
    ): Position[][] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        let resultArray = [];
        try {
            resultArray = this._module.SeqNumGrid(
                lat,
                lng,
                azimuth,
                aperture,
                resolution,
                topology,
                projection,
                sequenceNum
            );
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw(e);
        }

        const inputSize = sequenceNum.length;

        const allShapeVertexes = resultArray.slice(0, inputSize);

        const sumVertexes = allShapeVertexes.reduce((accumulator, currentValue) => {
            return accumulator + currentValue;
        }, 0);

        const featureSet: Position[][] = [];

        let xOffset = inputSize;
        let yOffset = inputSize + sumVertexes;
        for (let i = 0; i < allShapeVertexes.length; i += 1) {
            const numVertexes = allShapeVertexes[i];

            const currentShapeXVertexes = resultArray.slice(xOffset, xOffset + numVertexes);
            const currentShapeYVertexes = resultArray.slice(yOffset, yOffset + numVertexes);

            const coordinates: Position[] = [];
            for (let i = 0; i < numVertexes; i += 1) {
                coordinates.push([currentShapeXVertexes[i], currentShapeYVertexes[i]]);
            }
            featureSet.push(coordinates);
            xOffset += numVertexes;
            yOffset += numVertexes;
        }

        return featureSet;
    }

    sequenceNumToGridFeatureCollection(
        sequenceNum: bigint[],
        resolution: number = DEFAULT_RESOLUTION
    ): FeatureCollection<Polygon, DGGSGeoJsonProperty> {

        const coordinatesArray = this.sequenceNumToGrid(sequenceNum, resolution);

        const features = coordinatesArray.map((coordinates, index) => {
            const seqNum = sequenceNum[index];
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                },
                id: seqNum as unknown as number,
                properties: {
                    id: seqNum
                } as DGGSGeoJsonProperty
            } as Feature<Polygon, DGGSGeoJsonProperty>;
        });

        return {
            type: 'FeatureCollection',
            features,
        };
    }
}
