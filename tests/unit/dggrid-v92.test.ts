import { describe, test, beforeAll, expect } from 'vitest';
import {
    Webdggrid, Topology, Projection, Datum, OrientationPreset,
    orientationPreset, type IDGGSProps,
} from '../../lib-esm/webdggrid';

// Features added with DGGRID 9.15–9.2: cell boundaries with the points where
// edges cross icosahedron face edges, and ellipsoidal (WGS84) distances.

const AUTHALIC_RADIUS_KM = 6371.00718091847;

const grid = (props: Partial<IDGGSProps> = {}): IDGGSProps => ({
    ...orientationPreset(OrientationPreset.ISEA),
    aperture: 4,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    ...props,
});

const allCells = (n: number) => Array.from({ length: n }, (_, i) => BigInt(i + 1));
const samePoint = (a: number[], b: number[], tol = 1e-9) =>
    Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol;

describe('DGGRID 9.2 features', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    describe('cell boundary edge crossings', () => {
        for (const projection of [Projection.ISEA, Projection.GNOMONIC]) {
            test(`${projection}: adds points only to cells that cross a face edge`, () => {
                const res = 3;
                dggs.setDggs(grid({ projection }), res);
                const cells = allCells(dggs.nCells(res));
                const plain = dggs.sequenceNumToGrid(cells, res, false);
                const crossed = dggs.sequenceNumToGrid(cells, res, { unwrap: false, edgeCrossings: true });

                let changed = 0;
                crossed.forEach((ring, i) => {
                    expect(ring.length).toBeGreaterThanOrEqual(plain[i].length);
                    if (ring.length > plain[i].length) changed++;
                    // the cell vertices are kept, in order
                    let k = 0;
                    for (const p of ring) if (k < plain[i].length && samePoint(p, plain[i][k])) k++;
                    expect(k).toBe(plain[i].length);
                });
                expect(changed).toBeGreaterThan(0);
                expect(changed).toBeLessThan(cells.length);
            });
        }

        test('sequenceNumToGridFeatureCollection forwards the options', () => {
            const res = 3;
            dggs.setDggs(grid(), res);
            const cells = allCells(dggs.nCells(res));
            const rings = dggs.sequenceNumToGrid(cells, res, { edgeCrossings: true });
            const fc = dggs.sequenceNumToGridFeatureCollection(cells, res, { edgeCrossings: true });
            expect(fc.features.map((f) => f.geometry.coordinates[0])).toEqual(rings);
        });
    });

    describe('densification', () => {
        test('inserts the requested points along each edge', () => {
            const res = 5;
            dggs.setDggs(grid(), res);
            const [cell] = dggs.geoToSequenceNum([[10, 45]], res);
            const [plain] = dggs.sequenceNumToGrid([cell], res);
            const edges = plain.length - 1;  // closed ring
            for (const d of [1, 4]) {
                const [dense] = dggs.sequenceNumToGrid([cell], res, { densification: d });
                expect(dense.length).toBe(edges * (d + 1) + 1);
                // every vertex of the plain ring is still there
                for (let i = 0; i < edges; i++) expect(dense[i * (d + 1)]).toEqual(plain[i]);
            }
        });

        test('rejects values outside 0–500', () => {
            dggs.setDggs(grid(), 3);
            expect(() => dggs.sequenceNumToGrid([1n], 3, { densification: -1 })).toThrow(/densification/);
            expect(() => dggs.sequenceNumToGrid([1n], 3, { densification: 501 })).toThrow(/densification/);
        });

        test('a boolean third argument still means unwrap', () => {
            dggs.setDggs(grid(), 3);
            expect(dggs.sequenceNumToGrid([1n, 2n], 3, false))
                .toEqual(dggs.sequenceNumToGrid([1n, 2n], 3, { unwrap: false }));
        });
    });

    describe('geoDistanceKM', () => {
        test('great-circle distance on the authalic sphere', () => {
            dggs.setDggs(grid(), 3);
            const [d] = dggs.geoDistanceKM([[0, 0]], [[90, 0]]);
            expect(d).toBeCloseTo(AUTHALIC_RADIUS_KM * Math.PI / 2, 6);
        });

        test('uses a custom sphere radius', () => {
            dggs.setDggs(grid({ sphereRadiusKm: 1000 }), 3);
            const [d] = dggs.geoDistanceKM([[0, 0]], [[0, 90]]);
            expect(d).toBeCloseTo(500 * Math.PI, 6);
        });

        test('WGS84 geodesic distance (Vincenty)', () => {
            dggs.setDggs(grid({ datum: Datum.WGS84 }), 3);
            const dms = (d: number, m: number, s: number) => Math.sign(d) * (Math.abs(d) + m / 60 + s / 3600);
            const d = dggs.geoDistanceKM(
                [[0, 0], [0, 0], [dms(144, 25, 29.5244), dms(-37, 57, 3.7203)]],
                [[1, 0], [0, 1], [dms(143, 55, 35.3839), dms(-37, 39, 10.1561)]],
            );
            // one degree of longitude on the equator is a·π/180
            expect(d[0]).toBeCloseTo(6378.137 * Math.PI / 180, 6);
            // one degree of latitude from the equator
            expect(d[1]).toBeCloseTo(110.574389, 5);
            // Flinders Peak to Buninyong, Vincenty's (1975) test line: 54972.271 m
            expect(d[2]).toBeCloseTo(54.972271, 5);
        });

        test('WGS84 refuses nearly antipodal points instead of aborting', () => {
            dggs.setDggs(grid({ datum: Datum.WGS84 }), 3);
            expect(() => dggs.geoDistanceKM([[0, 0]], [[179.5, 0]])).toThrow(/antipodal/);
            // the module is still usable afterwards
            expect(dggs.geoDistanceKM([[0, 0]], [[178.5, 0]])[0]).toBeGreaterThan(19800);
        });

        test('validates its input', () => {
            dggs.setDggs(grid(), 3);
            expect(() => dggs.geoDistanceKM([[0, 0]], [])).toThrow(/same length/);
            expect(() => dggs.geoDistanceKM([[0, 91]], [[0, 0]])).toThrow(/latitude/);
            expect(() => dggs.geoDistanceKM([[NaN, 0]], [[0, 0]])).toThrow(/finite/);
        });
    });

    describe('points on icosahedron vertices', () => {
        // vertex 0 is the grid pole; vertex 11 is its antipode
        const { poleCoordinates: { lat, lng } } = orientationPreset(OrientationPreset.ISEA);
        const vertices = [[lng, lat], [lng - 180, -lat]];

        for (const topology of [Topology.TRIANGLE, Topology.DIAMOND]) {
            test(`${topology}: land in a cell that has the vertex as a corner`, () => {
                const res = 4;
                dggs.setDggs(grid({ topology }), res);
                const cells = dggs.geoToSequenceNum(vertices, res);
                const rings = dggs.sequenceNumToGrid(cells, res, false);
                rings.forEach((ring, i) => {
                    expect(ring.some((p) => samePoint(p, vertices[i], 1e-6))).toBe(true);
                });
            });
        }
    });
});
