// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';
import { Feature, FeatureCollection, GeoJsonProperties, Polygon, Position } from 'geojson';

/**
 * The shape of each cell in the Discrete Global Grid System.
 *
 * DGGRID supports four cell topologies. The most common choice for geospatial
 * analysis is `HEXAGON` because hexagonal cells have equal adjacency (every
 * neighbour shares an edge), uniform area, and minimal boundary-to-area ratio.
 *
 * @export
 * @enum {string}
 *
 * @example
 * ```ts
 * import { Topology } from 'webdggrid';
 *
 * dggs.setDggs({ topology: Topology.HEXAGON, ... }, 4);
 * ```
 */
export enum Topology {
    /** Six-sided cells — the default and most widely used topology. */
    'HEXAGON' = 'HEXAGON',
    /** Three-sided cells. */
    'TRIANGLE' = 'TRIANGLE',
    /** Four-sided square cells. */
    'SQUARE' = 'SQUARE',
    /** Four-sided diamond cells (squares rotated 45°). */
    'DIAMOND' = 'DIAMOND',
}

/**
 * The map projection used to place the polyhedron faces onto the sphere.
 *
 * - **ISEA** (Icosahedral Snyder Equal Area) — preserves cell area at the cost
 *   of shape distortion. Recommended for most analytical use-cases.
 * - **FULLER** (Fuller/Dymaxion) — minimises shape distortion but does not
 *   preserve equal area.
 *
 * @export
 * @enum {string}
 *
 * @example
 * ```ts
 * import { Projection } from 'webdggrid';
 *
 * dggs.setDggs({ projection: Projection.ISEA, ... }, 4);
 * ```
 */
export enum Projection {
    /** Icosahedral Snyder Equal Area projection — equal-area cells. */
    'ISEA' = 'ISEA',
    /** Fuller/Dymaxion projection — shape-preserving cells. */
    'FULLER' = 'FULLER',
}

/**
 * A simple geographic coordinate expressed as latitude and longitude in
 * decimal degrees (WGS-84).
 *
 * @example
 * ```ts
 * const coord: Coordinate = { lat: 51.5, lng: -0.1 };
 * ```
 */
export interface Coordinate {
    /** Latitude in decimal degrees. Range: −90 to 90. */
    lat: number;
    /** Longitude in decimal degrees. Range: −180 to 180. */
    lng: number;
}

/**
 * GeoJSON `properties` object attached to every cell feature returned by
 * {@link Webdggrid.sequenceNumToGridFeatureCollection}.
 *
 * All numeric identifiers are `BigInt` because DGGRID cell sequence numbers
 * can exceed the safe integer range of IEEE-754 doubles at high resolutions.
 *
 * > **Note for MapLibre / Mapbox users:** structured-clone (used internally
 * > by these libraries' Web Workers) cannot serialise `BigInt`. Convert `id`
 * > to a string before calling `source.setData()`.
 */
export type DGGSGeoJsonProperty = GeoJsonProperties & {
    /**
     * The DGGS sequence number (cell ID) of this feature.
     * Unique within a given DGGS configuration and resolution.
     */
    id?: BigInt;
    /** Column index in an (i, j) address scheme, if available. */
    i?: BigInt;
    /** Row index in an (i, j) address scheme, if available. */
    j?: BigInt;
}

/**
 * Full configuration of a Discrete Global Grid System.
 *
 * A DGGS is fully defined by its polyhedron orientation (`poleCoordinates`,
 * `azimuth`), the subdivision scheme (`aperture`), the cell shape
 * (`topology`), and the map projection (`projection`).
 *
 * Pass this object to {@link Webdggrid.setDggs} to switch between grid
 * configurations at runtime.
 *
 * @example
 * ```ts
 * const myDggs: IDGGSProps = {
 *   poleCoordinates: { lat: 58.28, lng: 11.25 }, // Snyder orientation
 *   azimuth: 0,
 *   aperture: 4,
 *   topology: Topology.HEXAGON,
 *   projection: Projection.ISEA,
 * };
 * dggs.setDggs(myDggs, 5);
 * ```
 */
export interface IDGGSProps {
    /**
     * Geographic location of the icosahedron pole used to orient the grid.
     * Changing this rotates the entire grid on the globe, which can be used
     * to minimise cell distortion over a region of interest.
     * Defaults to `{ lat: 0, lng: 0 }`.
     */
    poleCoordinates: Coordinate;
    /**
     * Azimuth of the icosahedron pole in decimal degrees.
     * Rotates the grid around the pole axis. Defaults to `0`.
     */
    azimuth: number;
    /**
     * Subdivision aperture — the number of child cells each parent cell is
     * divided into when moving to the next finer resolution.
     *
     * | Aperture | Cells at res *r* (HEXAGON/ISEA) |
     * |---|---|
     * | 3 | 2 + 10 × 3^r |
     * | 4 | 2 + 10 × 4^r |
     * | 7 | 2 + 10 × 7^r |
     *
     * Aperture `4` is the most common choice and is the default.
     */
    aperture: 3 | 4 | 5 | 7;
    /** Shape of each cell. See {@link Topology}. */
    topology: Topology;
    /** Projection used to map the polyhedron faces onto the sphere. See {@link Projection}. */
    projection: Projection;
}

const DEFAULT_RESOLUTION = 1;
const DEFAULT_DGGS = {
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    aperture: 4
} as IDGGSProps;

/**
 * Main entry point for the WebDggrid library.
 *
 * `Webdggrid` wraps the DGGRID C++ library compiled to WebAssembly and exposes
 * methods for:
 * - **Grid configuration** — choose topology, projection, aperture, and
 *   resolution via {@link setDggs} / {@link setResolution}.
 * - **Coordinate conversion** — convert between geographic coordinates and
 *   DGGS cell IDs (sequence numbers) with {@link geoToSequenceNum} and
 *   {@link sequenceNumToGeo}.
 * - **Grid geometry** — retrieve the polygon boundary of any cell with
 *   {@link sequenceNumToGrid} or export a ready-to-render GeoJSON
 *   `FeatureCollection` with {@link sequenceNumToGridFeatureCollection}.
 * - **Grid statistics** — query cell counts, areas, and spacings with
 *   {@link nCells}, {@link cellAreaKM}, and {@link cellDistKM}.
 *
 * ## Quick start
 *
 * ```ts
 * import { Webdggrid } from 'webdggrid';
 *
 * const dggs = await Webdggrid.load();
 *
 * // Convert a geographic point to its DGGS cell ID at resolution 5
 * const [cellId] = dggs.geoToSequenceNum([[-73.9857, 40.7484]], 5);
 *
 * // Get the polygon boundary of that cell as GeoJSON
 * const geojson = dggs.sequenceNumToGridFeatureCollection([cellId], 5);
 * ```
 *
 * ## Lifecycle
 *
 * The WASM module is a singleton. Call {@link Webdggrid.load} once and reuse
 * the returned instance throughout your application. Call
 * {@link Webdggrid.unload} when you are completely done to free memory.
 */
export class Webdggrid {

    /**
     * The active DGGS configuration used by all conversion and statistics
     * methods. Change it at any time via {@link setDggs}.
     *
     * Defaults to ISEA4H (ISEA projection, aperture 4, hexagon topology,
     * pole at 0° N 0° E, azimuth 0°).
     */
    dggs: IDGGSProps = DEFAULT_DGGS;

    /**
     * The active grid resolution. Higher values produce finer, smaller cells.
     * The valid range depends on the aperture — for aperture 4 the practical
     * limit is around resolution 15 before cell counts become unwieldy.
     *
     * Change via {@link setResolution} or pass an explicit `resolution`
     * argument to any conversion method.
     *
     * Defaults to `1`.
     */
    resolution: number = DEFAULT_RESOLUTION;

    private constructor(protected _module: any) {
        this._module = _module;
    }

    /**
     * Compiles and instantiates the DGGRID WebAssembly module.
     *
     * This is the only way to construct a `Webdggrid` instance. The method is
     * asynchronous because WebAssembly compilation is prohibited on the main
     * thread for buffers larger than 4 KB.
     *
     * ```ts
     * const dggs = await Webdggrid.load();
     * ```
     *
     * ::: info
     * In general WebAssembly compilation is disallowed on the main thread if
     * the buffer size is larger than 4 KB, hence forcing `load` to be
     * asynchronous.
     * :::
     *
     * @returns A promise that resolves to a fully initialised `Webdggrid` instance.
     */
    static load(): Promise<typeof Webdggrid> {
        return loadWasm().then((module: any) => {
            return new Webdggrid(module);
        }).catch(console.log);
    }

    /**
     * Releases the compiled WASM instance and frees its memory.
     *
     * Call this when your application no longer needs the library. After
     * calling `unload`, any existing `Webdggrid` instances become unusable —
     * you must call {@link load} again to create a new one.
     */
    static unload() {
        unloadWasm();
    }

    /**
     * Returns the version string of the underlying DGGRID C++ library.
     *
     * ```ts
     * console.log(dggs.version()); // e.g. "8.3b"
     * ```
     *
     * @returns The DGGRID C++ library version string.
     */
    version(): string {
        return this._module.Webdggrid.prototype.version();
    }

    /**
     * Sets both the DGGS configuration and the resolution in one call.
     *
     * All subsequent conversion and statistics methods will use this
     * configuration unless they receive an explicit `resolution` argument.
     *
     * ```ts
     * dggs.setDggs({
     *   poleCoordinates: { lat: 0, lng: 0 },
     *   azimuth: 0,
     *   aperture: 4,
     *   topology: Topology.HEXAGON,
     *   projection: Projection.ISEA,
     * }, 5);
     * ```
     *
     * @param dggs - The new DGGS configuration. Defaults to ISEA4H at pole (0,0).
     * @param resolution - The new resolution level. Defaults to `1`.
     */
    setDggs(dggs: IDGGSProps = DEFAULT_DGGS, resolution: number = DEFAULT_RESOLUTION) {
        this.dggs = dggs;
        this.resolution = resolution;
    }

    /**
     * Returns the currently active grid resolution.
     *
     * ```ts
     * dggs.setResolution(7);
     * console.log(dggs.getResolution()); // 7
     * ```
     *
     * @returns The current resolution level.
     */
    getResolution(): number {
        return this.resolution;
    }

    /**
     * Sets the grid resolution used by default in all conversion and
     * statistics methods.
     *
     * ```ts
     * dggs.setResolution(5);
     * const count = dggs.nCells(); // uses resolution 5
     * ```
     *
     * @param resolution - The new resolution level. Must be a positive integer.
     */
    setResolution(resolution: number) {
        this.resolution = resolution;
    }

    /**
     * Internal test helper that invokes the WASM module's `_main` entry point.
     * Not intended for production use.
     * @internal
     */
    _main() {
        return this._module._main();
    }

    /**
     * Returns the total number of cells that tile the entire globe at the
     * given resolution under the current DGGS configuration.
     *
     * Cell counts grow exponentially with resolution. For the default ISEA4H
     * grid:
     *
     * | Resolution | Approx. cell count |
     * |---|---|
     * | 1 | 42 |
     * | 2 | 162 |
     * | 3 | 642 |
     * | 4 | 2 562 |
     * | 5 | 10 242 |
     * | 6 | 40 962 |
     *
     * ```ts
     * const total = dggs.nCells(3); // 642
     * ```
     *
     * @param resolution - Resolution level to query. Defaults to the instance's
     *   current {@link resolution}.
     * @returns Total number of cells at the given resolution.
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
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    /**
     * Returns the average area of a single cell in square kilometres at the
     * given resolution.
     *
     * Because ISEA guarantees equal-area cells, all cells have the same area
     * when using the `ISEA` projection. With `FULLER` the value is an average.
     *
     * ```ts
     * const areakm2 = dggs.cellAreaKM(5);
     * ```
     *
     * @param resolution - Resolution level to query. Defaults to the instance's
     *   current {@link resolution}.
     * @returns Average cell area in km².
     */
    cellAreaKM(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.cellAreaKM(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    /**
     * Returns the average centre-to-centre distance between neighbouring cells
     * in kilometres at the given resolution.
     *
     * This is useful for estimating spatial join radii or selecting a
     * resolution that matches a target spatial scale.
     *
     * ```ts
     * const spacingKm = dggs.cellDistKM(5);
     * ```
     *
     * @param resolution - Resolution level to query. Defaults to the instance's
     *   current {@link resolution}.
     * @returns Average cell spacing in km.
     */
    cellDistKM(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.cellDistKM(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    /**
     * Returns the characteristic length scale (CLS) of the grid at the given
     * resolution — defined as the square root of the average cell area.
     *
     * CLS provides a single scalar that summarises the spatial granularity of
     * the grid, useful for comparing resolutions across different DGGS
     * configurations.
     *
     * ```ts
     * const cls = dggs.gridStatCLS(4);
     * ```
     *
     * @param resolution - Resolution level to query. Defaults to the instance's
     *   current {@link resolution}.
     * @returns Grid CLS value.
     */
    gridStatCLS(resolution: number = DEFAULT_RESOLUTION): number {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
        } = this.dggs;

        const cellCount = this._module.gridStatCLS(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection
        );

        return cellCount as number;
    }

    /**
     * Converts an array of geographic coordinates to their corresponding DGGS
     * cell sequence numbers (cell IDs) at the given resolution.
     *
     * Each coordinate is mapped to the single cell whose boundary contains it.
     * Multiple coordinates that fall within the same cell will return the same
     * sequence number.
     *
     * Coordinates must be supplied in **`[lng, lat]`** order (GeoJSON
     * convention), **not** `[lat, lng]`.
     *
     * ```ts
     * // New York City
     * const ids = dggs.geoToSequenceNum([[-74.006, 40.7128]], 5);
     * console.log(ids); // [12345n]
     *
     * // Multiple points at once
     * const ids2 = dggs.geoToSequenceNum(
     *   [[-74.006, 40.7128], [2.3522, 48.8566]],
     *   5
     * );
     * ```
     *
     * @param coordinates - Array of `[lng, lat]` pairs in decimal degrees.
     * @param resolution - Resolution at which to perform the lookup. Defaults
     *   to the instance's current {@link resolution}.
     * @returns Array of `BigInt` sequence numbers, one per input coordinate,
     *   in the same order.
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
            lng,
            lat,
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
     * Converts an array of DGGS cell sequence numbers to the geographic
     * coordinates of their centroids.
     *
     * The returned coordinates are in **`[lng, lat]`** order (GeoJSON
     * convention).
     *
     * ```ts
     * const centroids = dggs.sequenceNumToGeo([1n, 2n, 3n], 3);
     * // [[lng0, lat0], [lng1, lat1], [lng2, lat2]]
     * ```
     *
     * @param sequenceNum - Array of `BigInt` cell IDs to look up.
     * @param resolution - Resolution at which the IDs were generated. Defaults
     *   to the instance's current {@link resolution}.
     * @returns Array of `[lng, lat]` centroid positions, one per input ID, in
     *   the same order.
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
            lng,
            lat,
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
     * Snaps an array of geographic coordinates to the centroid of the DGGS
     * cell that contains each point.
     *
     * This is equivalent to calling {@link geoToSequenceNum} followed by
     * {@link sequenceNumToGeo} but is more efficient because it avoids
     * returning the intermediate sequence numbers.
     *
     * Useful for spatial aggregation: all points that fall within the same
     * cell will map to the identical centroid coordinate.
     *
     * Coordinates must be in **`[lng, lat]`** order.
     *
     * ```ts
     * const snapped = dggs.geoToGeo(
     *   [[-74.006, 40.7128], [-74.010, 40.720]],
     *   5
     * );
     * // Both points snap to the same centroid if they share a cell
     * ```
     *
     * @param coordinates - Array of `[lng, lat]` pairs in decimal degrees.
     * @param resolution - Resolution at which to perform the snapping. Defaults
     *   to the instance's current {@link resolution}.
     * @returns Array of `[lng, lat]` cell centroid positions, one per input
     *   coordinate, in the same order.
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
            lng,
            lat,
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
     * Returns the polygon boundary vertices for each cell in `sequenceNum`.
     *
     * Each cell is represented as an array of `[lng, lat]` vertex positions.
     * The ring is **not** automatically closed (the first and last vertex are
     * different) — close it yourself if your renderer requires it.
     *
     * Prefer {@link sequenceNumToGridFeatureCollection} when you need
     * GeoJSON output ready for a mapping library.
     *
     * ```ts
     * const rings = dggs.sequenceNumToGrid([1n, 2n], 3);
     * // rings[0] = [[lng0,lat0], [lng1,lat1], ..., [lng5,lat5]]  (hexagon)
     * ```
     *
     * @param sequenceNum - Array of `BigInt` cell IDs whose boundaries to
     *   retrieve.
     * @param resolution - Resolution at which the IDs were generated. Defaults
     *   to the instance's current {@link resolution}.
     * @returns A 2-D array: `result[i]` is the vertex ring of `sequenceNum[i]`.
     *   Each vertex is a `[lng, lat]` position.
     * @throws If the WASM module encounters an invalid cell ID.
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

        const inputSize = sequenceNum.length;

        let resultArray = [];
        try {
            resultArray = this._module.SeqNumGrid(
                lng,
                lat,
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

    /**
     * Converts an array of DGGS cell IDs into a GeoJSON `FeatureCollection`
     * where each `Feature` is a `Polygon` representing the cell boundary.
     *
     * This is the primary method for rendering DGGS cells with mapping
     * libraries such as MapLibre GL JS, Leaflet, or deck.gl.
     *
     * Each feature includes:
     * - `geometry` — a closed `Polygon` in `[lng, lat]` coordinate order.
     * - `id` — the cell sequence number (converted to `string` recommended
     *   before passing to MapLibre to avoid BigInt serialisation errors).
     * - `properties.id` — same value as `id`, accessible inside layer
     *   expressions.
     *
     * ```ts
     * const ids = dggs.geoToSequenceNum([[-74.006, 40.7128]], 5);
     * const fc  = dggs.sequenceNumToGridFeatureCollection(ids, 5);
     *
     * // MapLibre / structured-clone safe: convert BigInt → string
     * fc.features.forEach(f => {
     *   if (typeof f.id === 'bigint') f.id = f.id.toString();
     *   if (f.properties?.id) f.properties.id = f.properties.id.toString();
     * });
     *
     * map.getSource('grid').setData(fc);
     * ```
     *
     * @param sequenceNum - Array of `BigInt` cell IDs to convert.
     * @param resolution - Resolution at which the IDs were generated. Defaults
     *   to the instance's current {@link resolution}.
     * @returns A GeoJSON `FeatureCollection` of `Polygon` features, one per
     *   input cell ID.
     */
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
