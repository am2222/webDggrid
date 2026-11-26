import { describe, test, beforeAll, expect } from 'vitest';
import {
    Webdggrid, Topology, Projection, Datum, IndexingSystem, OrientationPreset,
    orientationPreset, dggsPreset, type IDGGSProps,
} from '../../lib-esm/webdggrid';

// Features added with DGGRID 9.3–9.31: QUADTREE indexing of aperture 4
// triangle grids, ZORDER on diamond grids, the new presets, geodesic cell
// areas, and the DgGeodesic inverse/direct solutions.

const AUTHALIC_RADIUS_KM = 6371.00718091847;
const WGS84_AREA_KM2 = 510065621.7240886;      // surface of the WGS84 ellipsoid
const WGS84_HALF_MERIDIAN_KM = 20003.931458623;

const grid = (props: Partial<IDGGSProps> = {}): IDGGSProps => ({
    ...orientationPreset(OrientationPreset.ISEA),
    aperture: 4,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    ...props,
});

const allCells = (n: number) => Array.from({ length: n }, (_, i) => BigInt(i + 1));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const dms = (d: number, m: number, s: number) => Math.sign(d) * (Math.abs(d) + m / 60 + s / 3600);
// Vincenty's (1975) test line: Flinders Peak to Buninyong
const FLINDERS = [dms(144, 25, 29.5244), dms(-37, 57, 3.7203)];
const BUNINYONG = [dms(143, 55, 35.3839), dms(-37, 39, 10.1561)];

describe('DGGRID 9.31 features', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    test('reports version 9.31', () => {
        expect(dggs.version()).toMatch(/9\.31/);
    });

    describe('presets', () => {
        test('Q presets are aperture 4 triangle grids', () => {
            expect(dggsPreset('ISEA4TSQ')).toEqual(dggsPreset('ISEA4TS'));
            expect(dggsPreset('IVEA4TLQ')).toMatchObject({
                topology: Topology.TRIANGLE, aperture: 4,
                projection: Projection.IVEA, datum: Datum.WGS84,
            });
            expect(dggsPreset('FULLER4TQ')).toEqual(dggsPreset('FULLER4T'));
        });

        test('diamond Z presets and FULLER S aliases', () => {
            expect(dggsPreset('ISEA4DSZ')).toEqual(dggsPreset('ISEA4DS'));
            expect(dggsPreset('IVEA4DLZ').datum).toBe(Datum.WGS84);
            expect(dggsPreset('FULLER4DZ')).toEqual(dggsPreset('FULLER4D'));
            for (const g of ['3H', '4H', '7H', '4T', '4D'] as const)
                expect(dggsPreset(`FULLER${g}S`)).toEqual(dggsPreset(`FULLER${g}`));
        });

        test('rejects names DGGRID does not define', () => {
            for (const name of ['ISEA4DLZ', 'ISEA4HSQ', 'ISEA4TQ', 'ISEA4TSZ', 'FULLER4HL', 'FULLER4HZ'])
                expect(() => dggsPreset(name as never)).toThrow(/Unknown or unsupported/);
        });
    });

    describe('QUADTREE indexing', () => {
        const res = 3;
        beforeAll(() => dggs.setDggs(dggsPreset('ISEA4TSQ'), res));

        test('round-trips every cell with unique indexes', () => {
            dggs.setDggs(dggsPreset('ISEA4TSQ'), res);
            const cells = allCells(dggs.nCells(res));
            expect(cells.length).toBe(20 * 4 ** res);
            const seen = new Set<bigint>();
            for (const sn of cells) {
                const q = dggs.sequenceNumToQuadtree(sn, res);
                seen.add(q);
                expect(dggs.quadtreeToSequenceNum(q, res)).toBe(sn);
            }
            expect(seen.size).toBe(cells.length);
        });

        test('root is in bits 63..59 and digits are two bits per level', () => {
            dggs.setDggs(dggsPreset('ISEA4TSQ'), res);
            for (const sn of allCells(dggs.nCells(res))) {
                const q = dggs.sequenceNumToQuadtree(sn, res);
                expect(Number(q >> 59n)).toBeLessThan(20);
                // unused digit slots below this resolution and bit 0 are zero
                expect(q & ((1n << BigInt(59 - 2 * res)) - 1n)).toBe(0n);
            }
        });

        test('indexing children have the parent as indexing parent', () => {
            dggs.setDggs(dggsPreset('ISEA4TSQ'), res);
            for (const sn of [1n, 37n, 640n]) {
                const [children] = dggs.sequenceNumIndexChildren([sn], res, IndexingSystem.QUADTREE);
                expect(children).toHaveLength(4);
                expect(dggs.sequenceNumIndexParent(children, res + 1, IndexingSystem.QUADTREE))
                    .toEqual(children.map(() => sn));
                // the child index extends the parent index by one digit
                const q = dggs.sequenceNumToQuadtree(sn, res);
                for (const c of children) {
                    const cq = dggs.sequenceNumToQuadtree(c, res + 1);
                    expect(cq & ~(3n << BigInt(57 - 2 * res))).toBe(q);
                }
            }
        });

        test('is the default indexing system for aperture 4 triangles', () => {
            dggs.setDggs(dggsPreset('ISEA4TSQ'), res);
            expect(dggs.sequenceNumIndexChildren([5n], res))
                .toEqual(dggs.sequenceNumIndexChildren([5n], res, IndexingSystem.QUADTREE));
        });

        test('is refused for other grids', () => {
            dggs.setDggs(grid(), res);
            expect(() => dggs.sequenceNumToQuadtree(1n, res)).toThrow(/QUADTREE/);
            expect(() => dggs.sequenceNumIndexChildren([1n], res, IndexingSystem.QUADTREE)).toThrow(/QUADTREE/);
        });
    });

    test('ZORDER round-trips on aperture 4 diamond grids', () => {
        const res = 3;
        dggs.setDggs(dggsPreset('ISEA4DSZ'), res);
        const cells = allCells(dggs.nCells(res));
        const seen = new Set<bigint>();
        for (const sn of cells) {
            const z = dggs.sequenceNumToZOrder(sn, res);
            seen.add(z);
            expect(dggs.zOrderToSequenceNum(z, res)).toBe(sn);
        }
        expect(seen.size).toBe(cells.length);
        const [children] = dggs.sequenceNumIndexChildren([7n], res, IndexingSystem.ZORDER);
        expect(children).toHaveLength(4);
    });

    describe('geodesic cell area', () => {
        for (const topology of [Topology.HEXAGON, Topology.TRIANGLE, Topology.DIAMOND]) {
            test(`${topology}: cells tile the sphere`, () => {
                const res = 3;
                dggs.setDggs(grid({ topology }), res);
                const areas = dggs.sequenceNumToAreaKM(allCells(dggs.nCells(res)), res);
                expect(sum(areas) / (4 * Math.PI * AUTHALIC_RADIUS_KM ** 2)).toBeCloseTo(1, 9);
            });
        }

        test('WGS84: cells tile the ellipsoid', () => {
            const res = 3;
            dggs.setDggs(grid({ datum: Datum.WGS84 }), res);
            const areas = dggs.sequenceNumToAreaKM(allCells(dggs.nCells(res)), res);
            expect(sum(areas) / WGS84_AREA_KM2).toBeCloseTo(1, 8);
        });

        test('hexagons are close to the equal-area average, pentagons 5/6 of it', () => {
            const res = 4;
            dggs.setDggs(grid(), res);
            const cells = allCells(dggs.nCells(res));
            const areas = dggs.sequenceNumToAreaKM(cells, res, { densification: 20 });
            const hex = (4 * Math.PI * AUTHALIC_RADIUS_KM ** 2) / (cells.length - 2);
            const ratios = areas.map((a) => a / hex).sort((a, b) => a - b);
            // the 12 pentagons
            for (const r of ratios.slice(0, 12)) expect(r).toBeCloseTo(5 / 6, 2);
            for (const r of ratios.slice(12)) expect(Math.abs(r - 1)).toBeLessThan(0.01);
        });

        test('scales with a custom sphere radius', () => {
            dggs.setDggs(grid({ sphereRadiusKm: 1000 }), 2);
            const areas = dggs.sequenceNumToAreaKM(allCells(dggs.nCells(2)), 2);
            expect(sum(areas)).toBeCloseTo(4 * Math.PI * 1e6, 3);
        });

        test('validates its input', () => {
            dggs.setDggs(grid(), 3);
            expect(() => dggs.sequenceNumToAreaKM([0n], 3)).toThrow(/out of range/);
            expect(() => dggs.sequenceNumToAreaKM([BigInt(dggs.nCells(3) + 1)], 3)).toThrow(/out of range/);
            expect(() => dggs.sequenceNumToAreaKM([1n], 3, { densification: 501 })).toThrow(/densification/);
        });
    });

    describe('geodesics', () => {
        test('WGS84 distance converges for antipodal points', () => {
            dggs.setDggs(grid({ datum: Datum.WGS84 }), 3);
            const [d, dPole] = dggs.geoDistanceKM([[0, 0], [0, 90]], [[180, 0], [0, -90]]);
            expect(d).toBeCloseTo(WGS84_HALF_MERIDIAN_KM, 5);
            expect(dPole).toBeCloseTo(WGS84_HALF_MERIDIAN_KM, 5);
        });

        test('inverse: distance and azimuth on Vincenty\'s test line', () => {
            dggs.setDggs(grid({ datum: Datum.WGS84 }), 3);
            const [r] = dggs.geodesicInverse([FLINDERS], [BUNINYONG]);
            expect(r.distanceKM).toBeCloseTo(54.972271, 5);
            // 306° 52' 05.37" clockwise from north
            expect(r.azimuth + 360).toBeCloseTo(dms(306, 52, 5.37), 4);
            expect(dggs.geodesicInverse([[1, 2]], [[1, 2]])[0]).toEqual({ distanceKM: 0, azimuth: 0 });
        });

        test('direct inverts inverse', () => {
            for (const datum of [Datum.AUTHALIC_SPHERE, Datum.WGS84]) {
                dggs.setDggs(grid({ datum }), 3);
                const from = [[FLINDERS[0], FLINDERS[1]], [10, 45], [-170, -60], [0, 0]];
                const to = [[BUNINYONG[0], BUNINYONG[1]], [-100, 30], [175, -61], [179, 0.5]];
                const inv = dggs.geodesicInverse(from, to);
                const dest = dggs.geodesicDirect(from, inv.map((r) => r.azimuth), inv.map((r) => r.distanceKM));
                dest.forEach((p, i) => {
                    expect(p[0]).toBeCloseTo(to[i][0], 7);
                    expect(p[1]).toBeCloseTo(to[i][1], 7);
                });
            }
        });

        test('direct on the sphere: a quarter circle east of Null Island', () => {
            dggs.setDggs(grid(), 3);
            const [[lng, lat]] = dggs.geodesicDirect([[0, 0]], [90], [AUTHALIC_RADIUS_KM * Math.PI / 2]);
            expect(lng).toBeCloseTo(90, 9);
            expect(lat).toBeCloseTo(0, 9);
        });

        test('validates its input', () => {
            dggs.setDggs(grid(), 3);
            expect(() => dggs.geodesicInverse([[0, 0]], [])).toThrow(/same length/);
            expect(() => dggs.geodesicInverse([[0, 91]], [[0, 0]])).toThrow(/latitude/);
            expect(() => dggs.geodesicDirect([[0, 0]], [90], [])).toThrow(/same length/);
            expect(() => dggs.geodesicDirect([[0, 0]], [NaN], [1])).toThrow(/finite/);
            // still usable after the errors
            expect(dggs.geodesicDirect([[0, 0]], [0], [0])[0]).toEqual([0, 0]);
        });
    });
});
