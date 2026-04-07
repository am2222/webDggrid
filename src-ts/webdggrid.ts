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
 * VERTEX2DD coordinate representation.
 * 
 * Represents a position relative to the icosahedron vertices and triangular
 * faces in DGGRID's coordinate system.
 */
export interface Vertex2DDCoordinate {
    /** Whether to keep this vertex. */
    keep: boolean;
    /** Vertex number (0-11 for icosahedron). */
    vertNum: number;
    /** Triangle number on the icosahedron. */
    triNum: number;
    /** X coordinate within the triangle. */
    x: number;
    /** Y coordinate within the triangle. */
    y: number;
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
     * Ignored if `apertureSequence` is specified.
     */
    aperture?: 3 | 4 | 5 | 7;
    /**
     * Mixed aperture sequence (e.g., `"434747"`).
     * 
     * When specified, each character defines the aperture for that resolution level.
     * The maximum resolution is limited to the length of the sequence string.
     * 
     * **Constraints:**
     * - Only valid for `HEXAGON` topology
     * - Only characters `'3'`, `'4'`, and `'7'` are allowed
     * - SEQNUM addressing is not supported (operations will fail)
     * - Z3/Z7 hierarchical indexing is not supported
     * 
     * @example
     * ```ts
     * // Resolution 1 uses aperture 4, res 2 uses aperture 3, etc.
     * apertureSequence: "434747"
     * ```
     */
    apertureSequence?: string;
    /** Shape of each cell. See {@link Topology}. */
    topology: Topology;
    /** Projection used to map the polyhedron faces onto the sphere. See {@link Projection}. */
    projection: Projection;
}

/**
 * Rewraps a polygon ring that crosses the antimeridian so that all longitudes
 * are in a contiguous range (some may exceed 180°).  This is the format
 * expected by MapLibre GL / Mapbox GL globe projection for antimeridian cells.
 * For renderers that require standard [-180, 180] coordinates, use the raw
 * output from {@link Webdggrid.sequenceNumToGrid} directly.
 */
export function unwrapAntimeridianRing(ring: Position[]): Position[] {
    let minLon = ring[0][0];
    let maxLon = ring[0][0];
    for (let i = 1; i < ring.length; i++) {
        const lon = ring[i][0];
        if (lon < minLon) minLon = lon;
        else if (lon > maxLon) maxLon = lon;
    }
    if (maxLon - minLon <= 180) return ring;
    return ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        const cellCount = this._module.nCells(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            isApertureSequence,
            apSeq
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        const cellCount = this._module.cellAreaKM(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            isApertureSequence,
            apSeq
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        const cellCount = this._module.cellDistKM(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            isApertureSequence,
            apSeq
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        const cellCount = this._module.gridStatCLS(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            isApertureSequence,
            apSeq
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

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
            isApertureSequence,
            apSeq,
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        const resultArray = this._module.SEQNUM_to_GEO(
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            isApertureSequence,
            apSeq,
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

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
            isApertureSequence,
            apSeq,
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
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

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
                isApertureSequence,
                apSeq,
                sequenceNum
            );
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw (e);
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

            const coordinates: Position[] = [];
            for (let j = 0; j < numVertexes; j += 1) {
                coordinates.push([resultArray[xOffset + j], resultArray[yOffset + j]]);
            }
            featureSet.push(unwrapAntimeridianRing(coordinates));
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

    /**
     * Returns all neighboring cells (sharing an edge) for each input cell.
     *
     * For hexagonal grids, each interior cell typically has 6 neighbors.
     * Pentagon cells and boundary cells may have fewer. Triangle topology
     * is not supported by the underlying DGGRID library.
     *
     * The output is a 2-D array: `result[i]` contains all neighbors of
     * `sequenceNum[i]`.
     *
     * ```ts
     * const neighbors = dggs.sequenceNumNeighbors([123n], 5);
     * // neighbors[0] = [122n, 124n, 125n, 126n, 127n, 128n]
     * ```
     *
     * ::: warning
     * Triangle topology is **not supported**. Attempting to retrieve neighbors
     * for a TRIANGLE grid will throw an error.
     * :::
     *
     * @param sequenceNum - Array of `BigInt` cell IDs whose neighbors to find.
     * @param resolution - Resolution at which the IDs were generated. Defaults
     *   to the instance's current {@link resolution}.
     * @returns A 2-D array of `BigInt[]`: `result[i]` is the array of neighbor
     *   IDs for `sequenceNum[i]`.
     * @throws If Triangle topology is used or if an invalid cell ID is provided.
     */
    sequenceNumNeighbors(
        sequenceNum: bigint[],
        resolution: number = DEFAULT_RESOLUTION
    ): bigint[][] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
            apertureSequence,
        } = this.dggs;

        if (topology === Topology.TRIANGLE) {
            throw new Error('Neighbor detection is not supported for TRIANGLE topology');
        }

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        try {
            const resultArray = this._module.SEQNUMS_neighbors(
                lng,
                lat,
                azimuth,
                aperture,
                resolution,
                topology,
                projection,
                isApertureSequence,
                apSeq,
                sequenceNum
            );

            // The result is a flat array with format:
            // [count0, count1, ..., countN, neighbor0_0, neighbor0_1, ..., neighbor0_(count0-1), neighbor1_0, ...]
            const inputSize = sequenceNum.length;
            const counts = resultArray.slice(0, inputSize);
            const neighbors: bigint[][] = [];

            let offset = inputSize;
            for (let i = 0; i < inputSize; i++) {
                const count = Number(counts[i]);
                neighbors.push(resultArray.slice(offset, offset + count));
                offset += count;
            }

            return neighbors;
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw e;
        }
    }

    /**
     * Returns the parent cell at the next coarser resolution (resolution - 1)
     * for each input cell.
     *
     * The parent-child relationship forms a hierarchical index structure. For
     * aperture 4 grids, each parent contains 4 children; for aperture 7, each
     * parent contains 7 children.
     *
     * ```ts
     * const parents = dggs.sequenceNumParent([123n, 456n], 5);
     * // parents = [30n, 114n]  (at resolution 4)
     * ```
     *
     * ::: info
     * Calling this method at resolution 0 will throw an error because there
     * are no cells at resolution -1.
     * :::
     *
     * @param sequenceNum - Array of `BigInt` cell IDs whose parents to find.
     * @param resolution - Resolution at which the input IDs were generated.
     *   Must be > 0. Defaults to the instance's current {@link resolution}.
     * @returns Array of `BigInt` parent cell IDs at resolution - 1, one per
     *   input cell, in the same order.
     * @throws If resolution is 0 or if an invalid cell ID is provided.
     */
    sequenceNumParent(
        sequenceNum: bigint[],
        resolution: number = DEFAULT_RESOLUTION
    ): bigint[] {
        if (resolution <= 0) {
            throw new Error('Cannot get parent at resolution 0 or below');
        }

        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        try {
            const resultArray = this._module.SEQNUMS_parents(
                lng,
                lat,
                azimuth,
                aperture,
                resolution,
                topology,
                projection,
                isApertureSequence,
                apSeq,
                sequenceNum
            );

            return resultArray;
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw e;
        }
    }

    /**
     * Returns all child cells at the next finer resolution (resolution + 1)
     * for each input cell.
     *
     * The number of children depends on the aperture:
     * - Aperture 3: 3 children per parent
     * - Aperture 4: 4 children per parent
     * - Aperture 7: 7 children per parent
     *
     * The output is a 2-D array: `result[i]` contains all children of
     * `sequenceNum[i]`.
     *
     * ```ts
     * const children = dggs.sequenceNumChildren([30n], 4);
     * // children[0] = [120n, 121n, 122n, 123n]  (at resolution 5, aperture 4)
     * ```
     *
     * ::: info
     * Children always include both boundary and interior cells. The returned
     * cells completely cover the parent cell's area.
     * :::
     *
     * @param sequenceNum - Array of `BigInt` cell IDs whose children to find.
     * @param resolution - Resolution at which the input IDs were generated.
     *   Defaults to the instance's current {@link resolution}.
     * @returns A 2-D array of `BigInt[]`: `result[i]` is the array of child
     *   IDs for `sequenceNum[i]` at resolution + 1.
     * @throws If an invalid cell ID is provided or if the maximum resolution
     *   is exceeded.
     */
    sequenceNumChildren(
        sequenceNum: bigint[],
        resolution: number = DEFAULT_RESOLUTION
    ): bigint[][] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        try {
            const resultArray = this._module.SEQNUMS_children(
                lng,
                lat,
                azimuth,
                aperture,
                resolution,
                topology,
                projection,
                isApertureSequence,
                apSeq,
                sequenceNum
            );

            // The result is a flat array with format:
            // [count0, count1, ..., countN, child0_0, child0_1, ..., child0_(count0-1), child1_0, ...]
            const inputSize = sequenceNum.length;
            const counts = resultArray.slice(0, inputSize);
            const children: bigint[][] = [];

            let offset = inputSize;
            for (let i = 0; i < inputSize; i++) {
                const count = Number(counts[i]);
                children.push(resultArray.slice(offset, offset + count));
                offset += count;
            }

            return children;
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw e;
        }
    }

    // =========================================================================
    // Hierarchical Address Type Conversions
    // These methods convert between SEQNUM and hierarchical indexing systems
    // =========================================================================

    /**
     * Convert a SEQNUM cell ID to VERTEX2DD (icosahedral vertex) coordinates.
     *
     * VERTEX2DD addresses represent positions relative to the vertices and
     * triangular faces of the underlying icosahedron.
     *
     * ```ts
     * const vertex = dggs.sequenceNumToVertex2DD(100n, 5);
     * // vertex = { keep: true, vertNum: 1, triNum: 1, x: 0.0625, y: 0.054... }
     * ```
     *
     * @param sequenceNum - The cell sequence number to convert.
     * @param resolution - Resolution of the input cell. Defaults to the
     *   instance's current {@link resolution}.
     * @returns An object with `{keep, vertNum, triNum, x, y}` representing
     *   the vertex coordinate.
     */
    sequenceNumToVertex2DD(
        sequenceNum: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): Vertex2DDCoordinate {
        try {
            const result = this._module.SEQNUM_to_VERTEX2DD(
                ...this._getParams(resolution),
                sequenceNum
            );
            return result;
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw e;
        }
    }

    /**
     * Convert VERTEX2DD (icosahedral vertex) coordinates to a SEQNUM cell ID.
     *
     * ```ts
     * const seqnum = dggs.vertex2DDToSequenceNum(true, 1, 1, 0.0625, 0.054, 5);
     * // seqnum = 100n
     * ```
     *
     * @param keep - Whether to keep this vertex.
     * @param vertNum - Vertex number (0-11 for icosahedron).
     * @param triNum - Triangle number on the icosahedron.
     * @param x - X coordinate within the triangle.
     * @param y - Y coordinate within the triangle.
     * @param resolution - Resolution at which to compute the cell ID. Defaults
     *   to the instance's current {@link resolution}.
     * @returns The sequence number (BigInt) of the cell containing this coordinate.
     */
    vertex2DDToSequenceNum(
        keep: boolean,
        vertNum: number,
        triNum: number,
        x: number,
        y: number,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        try {
            return this._module.VERTEX2DD_to_SEQNUM(
                ...this._getParams(resolution),
                keep,
                vertNum,
                triNum,
                x,
                y
            );
        } catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw e;
        }
    }

    /**
     * Convert a SEQNUM cell ID to ZORDER (Z-order curve) coordinate.
     *
     * ZORDER uses digit-interleaved coordinates to create a space-filling
     * curve index. This provides good spatial locality for range queries.
     *
     * **Compatibility:** ZORDER is only available for **aperture 3 and 4**
     * hexagon grids. It is **NOT supported** for aperture 7.
     *
     * ```ts
     * // With aperture 4:
     * const zorder = dggs.sequenceNumToZOrder(100n, 5);
     * // zorder = 1168684103302643712n
     * ```
     *
     * @param sequenceNum - The cell sequence number to convert.
     * @param resolution - Resolution of the input cell. Defaults to the
     *   instance's current {@link resolution}.
     * @returns A BigInt representing the Z-order coordinate.
     * @throws If used with an incompatible aperture (7) or topology.
     */
    sequenceNumToZOrder(
        sequenceNum: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        const { aperture, apertureSequence } = this.dggs;

        // Check aperture compatibility
        if (aperture === 7 && !apertureSequence) {
            throw new Error(
                'ZORDER is not available for aperture 7. ' +
                'Use Z7 hierarchical indexing instead, or switch to aperture 3 or 4.'
            );
        }

        try {
            return this._module.SEQNUM_to_ZORDER(
                ...this._getParams(resolution),
                sequenceNum
            );
        } catch (e) {
            const errMsg = this._module.getExceptionMessage(e).toString();
            if (errMsg.includes('aperture')) {
                throw new Error(
                    `ZORDER error: ${errMsg}. ZORDER requires aperture 3 or 4 (not 7).`
                );
            }
            console.error(errMsg);
            throw e;
        }
    }

    /**
     * Convert a ZORDER (Z-order curve) coordinate to a SEQNUM cell ID.
     *
     * ```ts
     * const seqnum = dggs.zOrderToSequenceNum(1168684103302643712n, 5);
     * // seqnum = 100n
     * ```
     *
     * @param zorderValue - The Z-order coordinate value (BigInt).
     * @param resolution - Resolution at which to compute the cell ID. Defaults
     *   to the instance's current {@link resolution}.
     * @returns The sequence number (BigInt) corresponding to this Z-order value.
     * @throws If used with an incompatible aperture (7) or topology.
     */
    zOrderToSequenceNum(
        zorderValue: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        const { aperture, apertureSequence } = this.dggs;

        if (aperture === 7 && !apertureSequence) {
            throw new Error(
                'ZORDER is not available for aperture 7. ' +
                'Use Z7 hierarchical indexing instead, or switch to aperture 3 or 4.'
            );
        }

        try {
            return this._module.ZORDER_to_SEQNUM(
                ...this._getParams(resolution),
                zorderValue
            );
        } catch (e) {
            const errMsg = this._module.getExceptionMessage(e).toString();
            if (errMsg.includes('aperture')) {
                throw new Error(
                    `ZORDER error: ${errMsg}. ZORDER requires aperture 3 or 4 (not 7).`
                );
            }
            console.error(errMsg);
            throw e;
        }
    }

    /**
     * Convert a SEQNUM cell ID to Z3 (base-3 Central Place Indexing) coordinate.
     *
     * Z3 uses base-3 digit encoding optimized for aperture 3 hexagon grids.
     * Each parent cell contains exactly 3 children in the hierarchy.
     *
     * **Compatibility:** Z3 is **only available for aperture 3** hexagon grids.
     *
     * ```ts
     * // With aperture 3:
     * const z3 = dggs.sequenceNumToZ3(100n, 5);
     * // z3 = 1773292353277132799n
     * ```
     *
     * @param sequenceNum - The cell sequence number to convert.
     * @param resolution - Resolution of the input cell. Defaults to the
     *   instance's current {@link resolution}.
     * @returns A BigInt representing the Z3 coordinate (INT64 format).
     * @throws If used with an incompatible aperture (not 3) or topology.
     */
    sequenceNumToZ3(
        sequenceNum: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        const { aperture, topology, apertureSequence } = this.dggs;

        if ((aperture !== 3 || topology !== 'HEXAGON') && !apertureSequence) {
            throw new Error(
                'Z3 is only available for aperture 3 hexagon grids. ' +
                `Current configuration: aperture ${aperture}, topology ${topology}.`
            );
        }

        try {
            return this._module.SEQNUM_to_Z3(
                ...this._getParams(resolution),
                sequenceNum
            );
        } catch (e) {
            const errMsg = this._module.getExceptionMessage(e).toString();
            if (errMsg.includes('aperture') || errMsg.includes('Z3')) {
                throw new Error(
                    `Z3 error: ${errMsg}. Z3 requires aperture 3 hexagon grids.`
                );
            }
            console.error(errMsg);
            throw e;
        }
    }

    /**
     * Convert a Z3 (base-3 Central Place Indexing) coordinate to a SEQNUM cell ID.
     *
     * ```ts
     * const seqnum = dggs.z3ToSequenceNum(1773292353277132799n, 5);
     * // seqnum = 100n
     * ```
     *
     * @param z3Value - The Z3 coordinate value (BigInt, INT64 format).
     * @param resolution - Resolution at which to compute the cell ID. Defaults
     *   to the instance's current {@link resolution}.
     * @returns The sequence number (BigInt) corresponding to this Z3 value.
     * @throws If used with an incompatible aperture (not 3) or topology.
     */
    z3ToSequenceNum(
        z3Value: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        const { aperture, topology, apertureSequence } = this.dggs;

        if ((aperture !== 3 || topology !== 'HEXAGON') && !apertureSequence) {
            throw new Error(
                'Z3 is only available for aperture 3 hexagon grids. ' +
                `Current configuration: aperture ${aperture}, topology ${topology}.`
            );
        }

        try {
            return this._module.Z3_to_SEQNUM(
                ...this._getParams(resolution),
                z3Value
            );
        } catch (e) {
            const errMsg = this._module.getExceptionMessage(e).toString();
            if (errMsg.includes('aperture') || errMsg.includes('Z3')) {
                throw new Error(
                    `Z3 error: ${errMsg}. Z3 requires aperture 3 hexagon grids.`
                );
            }
            console.error(errMsg);
            throw e;
        }
    }

    /**
     * Convert a SEQNUM cell ID to Z7 (base-7 Central Place Indexing) coordinate.
     *
     * Z7 uses base-7 digit encoding with pure bitarithmetic operations,
     * optimized for aperture 7 hexagon grids. Each parent cell contains
     * exactly 7 children in the hierarchy.
     *
     * **Compatibility:** Z7 is **only available for aperture 7** hexagon grids.
     *
     * ```ts
     * // With aperture 7:
     * const z7 = dggs.sequenceNumToZ7(100n, 5);
     * // z7 = 1153167795211468799n (displayed as hex: 0x1000000000000fff)
     * ```
     *
     * @param sequenceNum - The cell sequence number to convert.
     * @param resolution - Resolution of the input cell. Defaults to the
     *   instance's current {@link resolution}.
     * @returns A BigInt representing the Z7 coordinate (INT64/hex format).
     * @throws If used with an incompatible aperture (not 7) or topology.
     */
    sequenceNumToZ7(
        sequenceNum: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        const { aperture, topology, apertureSequence } = this.dggs;

        if ((aperture !== 7 || topology !== 'HEXAGON') && !apertureSequence) {
            throw new Error(
                'Z7 is only available for aperture 7 hexagon grids. ' +
                `Current configuration: aperture ${aperture}, topology ${topology}.`
            );
        }

        try {
            return this._module.SEQNUM_to_Z7(
                ...this._getParams(resolution),
                sequenceNum
            );
        } catch (e) {
            const errMsg = this._module.getExceptionMessage(e).toString();
            if (errMsg.includes('aperture') || errMsg.includes('Z7')) {
                throw new Error(
                    `Z7 error: ${errMsg}. Z7 requires aperture 7 hexagon grids.`
                );
            }
            console.error(errMsg);
            throw e;
        }
    }

    /**
     * Convert a Z7 (base-7 Central Place Indexing) coordinate to a SEQNUM cell ID.
     *
     * ```ts
     * const seqnum = dggs.z7ToSequenceNum(1153167795211468799n, 5);
     * // seqnum = 100n
     * ```
     *
     * @param z7Value - The Z7 coordinate value (BigInt, INT64/hex format).
     * @param resolution - Resolution at which to compute the cell ID. Defaults
     *   to the instance's current {@link resolution}.
     * @returns The sequence number (BigInt) corresponding to this Z7 value.
     * @throws If used with an incompatible aperture (not 7) or topology.
     */
    z7ToSequenceNum(
        z7Value: bigint,
        resolution: number = DEFAULT_RESOLUTION
    ): bigint {
        const { aperture, topology, apertureSequence } = this.dggs;

        if ((aperture !== 7 || topology !== 'HEXAGON') && !apertureSequence) {
            throw new Error(
                'Z7 is only available for aperture 7 hexagon grids. ' +
                `Current configuration: aperture ${aperture}, topology ${topology}.`
            );
        }

        try {
            return this._module.Z7_to_SEQNUM(
                ...this._getParams(resolution),
                z7Value
            );
        } catch (e) {
            const errMsg = this._module.getExceptionMessage(e).toString();
            if (errMsg.includes('aperture') || errMsg.includes('Z7')) {
                throw new Error(
                    `Z7 error: ${errMsg}. Z7 requires aperture 7 hexagon grids.`
                );
            }
            console.error(errMsg);
            throw e;
        }
    }

    // =========================================================================
    // Low-level coordinate transformation methods
    // These methods expose all DGGRID coordinate systems beyond GEO/SEQNUM
    // =========================================================================

    /**
     * Helper to build the DGGS parameter array for WASM calls.
     * @private
     */
    private _getParams(resolution: number = DEFAULT_RESOLUTION): any[] {
        const {
            poleCoordinates: { lat, lng },
            azimuth,
            topology,
            projection,
            aperture,
            apertureSequence,
        } = this.dggs;

        const isApertureSequence = !!apertureSequence;
        const apSeq = apertureSequence || "";

        return [
            lng,
            lat,
            azimuth,
            aperture,
            resolution,
            topology,
            projection,
            isApertureSequence,
            apSeq
        ];
    }

    // -------------------------------------------------------------------------
    // GEO transformations (beyond the high-level methods above)
    // -------------------------------------------------------------------------

    /**
     * Converts geographic coordinates to PLANE coordinates.
     * 
     * @param coordinates - Array of `[lng, lat]` pairs
     * @param resolution - Resolution level
     * @returns Array of `{x, y}` plane coordinates
     */
    geoToPlane(coordinates: number[][], resolution: number = DEFAULT_RESOLUTION): Array<{ x: number, y: number }> {
        const xCoords = coordinates.map(c => c[0]);
        const yCoords = coordinates.map(c => c[1]);

        const result = this._module.GEO_to_PLANE(...this._getParams(resolution), xCoords, yCoords);

        const size = result.length / 2;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({ x: result[i], y: result[i + size] });
        }
        return output;
    }

    /**
     * Converts geographic coordinates to PROJTRI coordinates.
     * 
     * @param coordinates - Array of `[lng, lat]` pairs
     * @param resolution - Resolution level
     * @returns Array of `{tnum, x, y}` projection triangle coordinates
     */
    geoToProjtri(coordinates: number[][], resolution: number = DEFAULT_RESOLUTION): Array<{ tnum: number, x: number, y: number }> {
        const xCoords = coordinates.map(c => c[0]);
        const yCoords = coordinates.map(c => c[1]);

        const result = this._module.GEO_to_PROJTRI(...this._getParams(resolution), xCoords, yCoords);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                tnum: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts geographic coordinates to Q2DD coordinates.
     * 
     * @param coordinates - Array of `[lng, lat]` pairs
     * @param resolution - Resolution level
     * @returns Array of `{quad, x, y}` quad 2D double coordinates
     */
    geoToQ2dd(coordinates: number[][], resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, x: number, y: number }> {
        const xCoords = coordinates.map(c => c[0]);
        const yCoords = coordinates.map(c => c[1]);

        const result = this._module.GEO_to_Q2DD(...this._getParams(resolution), xCoords, yCoords);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts geographic coordinates to Q2DI coordinates.
     * 
     * @param coordinates - Array of `[lng, lat]` pairs
     * @param resolution - Resolution level
     * @returns Array of `{quad, i, j}` quad 2D integer coordinates
     */
    geoToQ2di(coordinates: number[][], resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, i: bigint, j: bigint }> {
        const xCoords = coordinates.map(c => c[0]);
        const yCoords = coordinates.map(c => c[1]);

        const result = this._module.GEO_to_Q2DI(...this._getParams(resolution), xCoords, yCoords);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                i: BigInt(result[i + size]),
                j: BigInt(result[i + 2 * size])
            });
        }
        return output;
    }

    // -------------------------------------------------------------------------
    // SEQNUM transformations (beyond the high-level methods above)
    // -------------------------------------------------------------------------

    /**
     * Converts sequence numbers to PLANE coordinates.
     * 
     * @param sequenceNum - Array of cell IDs
     * @param resolution - Resolution level
     * @returns Array of `{x, y}` plane coordinates
     */
    sequenceNumToPlane(sequenceNum: bigint[], resolution: number = DEFAULT_RESOLUTION): Array<{ x: number, y: number }> {
        const result = this._module.SEQNUM_to_PLANE(...this._getParams(resolution), sequenceNum);

        const size = result.length / 2;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({ x: result[i], y: result[i + size] });
        }
        return output;
    }

    /**
     * Converts sequence numbers to PROJTRI coordinates.
     * 
     * @param sequenceNum - Array of cell IDs
     * @param resolution - Resolution level
     * @returns Array of `{tnum, x, y}` projection triangle coordinates
     */
    sequenceNumToProjtri(sequenceNum: bigint[], resolution: number = DEFAULT_RESOLUTION): Array<{ tnum: number, x: number, y: number }> {
        const result = this._module.SEQNUM_to_PROJTRI(...this._getParams(resolution), sequenceNum);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                tnum: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts sequence numbers to Q2DD coordinates.
     * 
     * @param sequenceNum - Array of cell IDs
     * @param resolution - Resolution level
     * @returns Array of `{quad, x, y}` quad 2D double coordinates
     */
    sequenceNumToQ2dd(sequenceNum: bigint[], resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, x: number, y: number }> {
        const result = this._module.SEQNUM_to_Q2DD(...this._getParams(resolution), sequenceNum);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts sequence numbers to Q2DI coordinates.
     * 
     * @param sequenceNum - Array of cell IDs
     * @param resolution - Resolution level
     * @returns Array of `{quad, i, j}` quad 2D integer coordinates
     */
    sequenceNumToQ2di(sequenceNum: bigint[], resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, i: bigint, j: bigint }> {
        const result = this._module.SEQNUM_to_Q2DI(...this._getParams(resolution), sequenceNum);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                i: BigInt(result[i + size]),
                j: BigInt(result[i + 2 * size])
            });
        }
        return output;
    }

    // -------------------------------------------------------------------------
    // Q2DI transformations
    // -------------------------------------------------------------------------

    /**
     * Converts Q2DI coordinates to geographic coordinates.
     * 
     * @param coords - Array of `{quad, i, j}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `[lng, lat]` positions
     */
    q2diToGeo(coords: Array<{ quad: number, i: bigint, j: bigint }>, resolution: number = DEFAULT_RESOLUTION): Position[] {
        const quads = coords.map(c => c.quad);
        const is = coords.map(c => Number(c.i));
        const js = coords.map(c => Number(c.j));

        const result = this._module.Q2DI_to_GEO(...this._getParams(resolution), quads, is, js);

        const size = result.length / 2;
        const output: Position[] = [];
        for (let i = 0; i < size; i++) {
            output.push([result[i], result[i + size]]);
        }
        return output;
    }

    /**
     * Converts Q2DI coordinates to sequence numbers.
     * 
     * @param coords - Array of `{quad, i, j}` coordinates
     * @param resolution - Resolution level
     * @returns Array of cell IDs
     */
    q2diToSequenceNum(coords: Array<{ quad: number, i: bigint, j: bigint }>, resolution: number = DEFAULT_RESOLUTION): bigint[] {
        const quads = coords.map(c => c.quad);
        const is = coords.map(c => Number(c.i));
        const js = coords.map(c => Number(c.j));

        return this._module.Q2DI_to_SEQNUM(...this._getParams(resolution), quads, is, js);
    }

    /**
     * Converts Q2DI coordinates to PLANE coordinates.
     * 
     * @param coords - Array of `{quad, i, j}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{x, y}` plane coordinates
     */
    q2diToPlane(coords: Array<{ quad: number, i: bigint, j: bigint }>, resolution: number = DEFAULT_RESOLUTION): Array<{ x: number, y: number }> {
        const quads = coords.map(c => c.quad);
        const is = coords.map(c => Number(c.i));
        const js = coords.map(c => Number(c.j));

        const result = this._module.Q2DI_to_PLANE(...this._getParams(resolution), quads, is, js);

        const size = result.length / 2;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({ x: result[i], y: result[i + size] });
        }
        return output;
    }

    /**
     * Converts Q2DI coordinates to PROJTRI coordinates.
     * 
     * @param coords - Array of `{quad, i, j}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{tnum, x, y}` projection triangle coordinates
     */
    q2diToProjtri(coords: Array<{ quad: number, i: bigint, j: bigint }>, resolution: number = DEFAULT_RESOLUTION): Array<{ tnum: number, x: number, y: number }> {
        const quads = coords.map(c => c.quad);
        const is = coords.map(c => Number(c.i));
        const js = coords.map(c => Number(c.j));

        const result = this._module.Q2DI_to_PROJTRI(...this._getParams(resolution), quads, is, js);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                tnum: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts Q2DI coordinates to Q2DD coordinates.
     * 
     * @param coords - Array of `{quad, i, j}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{quad, x, y}` quad 2D double coordinates
     */
    q2diToQ2dd(coords: Array<{ quad: number, i: bigint, j: bigint }>, resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, x: number, y: number }> {
        const quads = coords.map(c => c.quad);
        const is = coords.map(c => Number(c.i));
        const js = coords.map(c => Number(c.j));

        const result = this._module.Q2DI_to_Q2DD(...this._getParams(resolution), quads, is, js);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    // -------------------------------------------------------------------------
    // Q2DD transformations
    // -------------------------------------------------------------------------

    /**
     * Converts Q2DD coordinates to geographic coordinates.
     * 
     * @param coords - Array of `{quad, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `[lng, lat]` positions
     */
    q2ddToGeo(coords: Array<{ quad: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Position[] {
        const quads = coords.map(c => c.quad);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.Q2DD_to_GEO(...this._getParams(resolution), quads, xs, ys);

        const size = result.length / 2;
        const output: Position[] = [];
        for (let i = 0; i < size; i++) {
            output.push([result[i], result[i + size]]);
        }
        return output;
    }

    /**
     * Converts Q2DD coordinates to sequence numbers.
     * 
     * @param coords - Array of `{quad, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of cell IDs
     */
    q2ddToSequenceNum(coords: Array<{ quad: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): bigint[] {
        const quads = coords.map(c => c.quad);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        return this._module.Q2DD_to_SEQNUM(...this._getParams(resolution), quads, xs, ys);
    }

    /**
     * Converts Q2DD coordinates to PLANE coordinates.
     * 
     * @param coords - Array of `{quad, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{x, y}` plane coordinates
     */
    q2ddToPlane(coords: Array<{ quad: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Array<{ x: number, y: number }> {
        const quads = coords.map(c => c.quad);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.Q2DD_to_PLANE(...this._getParams(resolution), quads, xs, ys);

        const size = result.length / 2;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({ x: result[i], y: result[i + size] });
        }
        return output;
    }

    /**
     * Converts Q2DD coordinates to PROJTRI coordinates.
     * 
     * @param coords - Array of `{quad, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{tnum, x, y}` projection triangle coordinates
     */
    q2ddToProjtri(coords: Array<{ quad: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Array<{ tnum: number, x: number, y: number }> {
        const quads = coords.map(c => c.quad);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.Q2DD_to_PROJTRI(...this._getParams(resolution), quads, xs, ys);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                tnum: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts Q2DD coordinates to Q2DI coordinates.
     * 
     * @param coords - Array of `{quad, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{quad, i, j}` quad 2D integer coordinates
     */
    q2ddToQ2di(coords: Array<{ quad: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, i: bigint, j: bigint }> {
        const quads = coords.map(c => c.quad);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.Q2DD_to_Q2DI(...this._getParams(resolution), quads, xs, ys);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                i: BigInt(result[i + size]),
                j: BigInt(result[i + 2 * size])
            });
        }
        return output;
    }

    // -------------------------------------------------------------------------
    // PROJTRI transformations
    // -------------------------------------------------------------------------

    /**
     * Converts PROJTRI coordinates to geographic coordinates.
     * 
     * @param coords - Array of `{tnum, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `[lng, lat]` positions
     */
    projtriToGeo(coords: Array<{ tnum: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Position[] {
        const tnums = coords.map(c => c.tnum);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.PROJTRI_to_GEO(...this._getParams(resolution), tnums, xs, ys);

        const size = result.length / 2;
        const output: Position[] = [];
        for (let i = 0; i < size; i++) {
            output.push([result[i], result[i + size]]);
        }
        return output;
    }

    /**
     * Converts PROJTRI coordinates to sequence numbers.
     * 
     * @param coords - Array of `{tnum, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of cell IDs
     */
    projtriToSequenceNum(coords: Array<{ tnum: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): bigint[] {
        const tnums = coords.map(c => c.tnum);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        return this._module.PROJTRI_to_SEQNUM(...this._getParams(resolution), tnums, xs, ys);
    }

    /**
     * Converts PROJTRI coordinates to PLANE coordinates.
     * 
     * @param coords - Array of `{tnum, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{x, y}` plane coordinates
     */
    projtriToPlane(coords: Array<{ tnum: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Array<{ x: number, y: number }> {
        const tnums = coords.map(c => c.tnum);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.PROJTRI_to_PLANE(...this._getParams(resolution), tnums, xs, ys);

        const size = result.length / 2;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({ x: result[i], y: result[i + size] });
        }
        return output;
    }

    /**
     * Converts PROJTRI coordinates to Q2DD coordinates.
     * 
     * @param coords - Array of `{tnum, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{quad, x, y}` quad 2D double coordinates
     */
    projtriToQ2dd(coords: Array<{ tnum: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, x: number, y: number }> {
        const tnums = coords.map(c => c.tnum);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.PROJTRI_to_Q2DD(...this._getParams(resolution), tnums, xs, ys);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                x: result[i + size],
                y: result[i + 2 * size]
            });
        }
        return output;
    }

    /**
     * Converts PROJTRI coordinates to Q2DI coordinates.
     * 
     * @param coords - Array of `{tnum, x, y}` coordinates
     * @param resolution - Resolution level
     * @returns Array of `{quad, i, j}` quad 2D integer coordinates
     */
    projtriToQ2di(coords: Array<{ tnum: number, x: number, y: number }>, resolution: number = DEFAULT_RESOLUTION): Array<{ quad: number, i: bigint, j: bigint }> {
        const tnums = coords.map(c => c.tnum);
        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);

        const result = this._module.PROJTRI_to_Q2DI(...this._getParams(resolution), tnums, xs, ys);

        const size = result.length / 3;
        const output: any[] = [];
        for (let i = 0; i < size; i++) {
            output.push({
                quad: result[i],
                i: BigInt(result[i + size]),
                j: BigInt(result[i + 2 * size])
            });
        }
        return output;
    }

    // -------------------------------------------------------------------------
    // PLANE transformations
    // Note: PLANE is an output-only coordinate system in DGGRID.
    // There are no PLANE_to_* transformations available.
    // Use other coordinate systems (GEO, SEQNUM, Q2DI, Q2DD, PROJTRI) as input.
    // -------------------------------------------------------------------------
}
