// @ts-ignore
import { loadWasm, unloadWasm } from './libdggrid.wasm.js';
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
export var Topology;
(function (Topology) {
    /** Six-sided cells — the default and most widely used topology. */
    Topology["HEXAGON"] = "HEXAGON";
    /** Three-sided cells. */
    Topology["TRIANGLE"] = "TRIANGLE";
    /** Four-sided diamond cells (squares rotated 45°). */
    Topology["DIAMOND"] = "DIAMOND";
})(Topology || (Topology = {}));
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
export var Projection;
(function (Projection) {
    /** Icosahedral Snyder Equal Area projection — equal-area cells. */
    Projection["ISEA"] = "ISEA";
    /** Fuller/Dymaxion projection — shape-preserving cells. */
    Projection["FULLER"] = "FULLER";
})(Projection || (Projection = {}));
/**
 * Rewraps a polygon ring that crosses the antimeridian so that all longitudes
 * are in a contiguous range (some may exceed 180°).  This is the format
 * expected by MapLibre GL / Mapbox GL globe projection for antimeridian cells.
 * For renderers that require standard [-180, 180] coordinates, use the raw
 * output from {@link Webdggrid.sequenceNumToGrid} directly.
 */
export function unwrapAntimeridianRing(ring) {
    let minLon = ring[0][0];
    let maxLon = ring[0][0];
    for (let i = 1; i < ring.length; i++) {
        const lon = ring[i][0];
        if (lon < minLon)
            minLon = lon;
        else if (lon > maxLon)
            maxLon = lon;
    }
    if (maxLon - minLon <= 180)
        return ring;
    return ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
}
const DEFAULT_RESOLUTION = 1;
const DEFAULT_DGGS = {
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    aperture: 4
};
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
    constructor(_module) {
        this._module = _module;
        /**
         * The active DGGS configuration used by all conversion and statistics
         * methods. Change it at any time via {@link setDggs}.
         *
         * Defaults to ISEA4H (ISEA projection, aperture 4, hexagon topology,
         * pole at 0° N 0° E, azimuth 0°).
         */
        this.dggs = DEFAULT_DGGS;
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
        this.resolution = DEFAULT_RESOLUTION;
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
    static load() {
        return loadWasm().then((module) => {
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
    version() {
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
    setDggs(dggs = DEFAULT_DGGS, resolution = DEFAULT_RESOLUTION) {
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
    getResolution() {
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
    setResolution(resolution) {
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
    nCells(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.nCells(lng, lat, azimuth, aperture, resolution, topology, projection);
        return cellCount;
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
    cellAreaKM(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.cellAreaKM(lng, lat, azimuth, aperture, resolution, topology, projection);
        return cellCount;
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
    cellDistKM(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.cellDistKM(lng, lat, azimuth, aperture, resolution, topology, projection);
        return cellCount;
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
    gridStatCLS(resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const cellCount = this._module.gridStatCLS(lng, lat, azimuth, aperture, resolution, topology, projection);
        return cellCount;
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
    geoToSequenceNum(coordinates, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);
        const resultArray = this._module.DgGEO_to_SEQNUM(lng, lat, azimuth, aperture, resolution, topology, projection, xCoords, yCoords);
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
    sequenceNumToGeo(sequenceNum, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const resultArray = this._module.SEQNUM_to_GEO(lng, lat, azimuth, aperture, resolution, topology, projection, sequenceNum);
        const size = resultArray.length / 2;
        const arrayOfArrays = [];
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
    geoToGeo(coordinates, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const xCoords = coordinates.map((coord) => coord[0]);
        const yCoords = coordinates.map((coord) => coord[1]);
        const resultArray = this._module.GEO_to_GEO(lng, lat, azimuth, aperture, resolution, topology, projection, xCoords, yCoords);
        const size = resultArray.length / 2;
        const arrayOfArrays = [];
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
    sequenceNumToGrid(sequenceNum, resolution = DEFAULT_RESOLUTION) {
        const { poleCoordinates: { lat, lng }, azimuth, topology, projection, aperture, } = this.dggs;
        const inputSize = sequenceNum.length;
        let resultArray = [];
        try {
            resultArray = this._module.SeqNumGrid(lng, lat, azimuth, aperture, resolution, topology, projection, sequenceNum);
        }
        catch (e) {
            console.error(this._module.getExceptionMessage(e).toString());
            throw (e);
        }
        const allShapeVertexes = resultArray.slice(0, inputSize);
        const sumVertexes = allShapeVertexes.reduce((accumulator, currentValue) => {
            return accumulator + currentValue;
        }, 0);
        const featureSet = [];
        let xOffset = inputSize;
        let yOffset = inputSize + sumVertexes;
        for (let i = 0; i < allShapeVertexes.length; i += 1) {
            const numVertexes = allShapeVertexes[i];
            const coordinates = [];
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