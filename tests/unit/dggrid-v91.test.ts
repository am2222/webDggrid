import { describe, test, beforeAll, expect } from 'vitest';
import {
    Webdggrid, Topology, Projection, Datum, OrientationPreset,
    orientationPreset, dggsPreset, type DggsPresetName, type IDGGSProps,
} from '../../lib-esm/webdggrid';

// Features added with DGGRID 9.1: IVEA and GNOMONIC projections, the WGS84
// datum, custom sphere radius, orientation presets and preset grids.

const AUTHALIC_RADIUS_KM = 6371.00718091847;
const PTS = [[0.3, 0.2], [10, 45], [-122.7, 42.2], [179.99, -10], [-73.98, 40.75], [100, -60]];

// ray casting in lon/lat; fine for points well inside small cells
const inRing = ([x, y]: number[], ring: number[][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
};

const grid = (props: Partial<IDGGSProps> = {}): IDGGSProps => ({
    ...orientationPreset(OrientationPreset.ISEA),
    aperture: 4,
    topology: Topology.HEXAGON,
    projection: Projection.ISEA,
    ...props,
});

describe('DGGRID 9.1 features', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    describe('projections', () => {
        for (const projection of [Projection.IVEA, Projection.GNOMONIC]) {
            test(`${projection}: points fall in the cell whose boundary contains them`, () => {
                const res = 5;
                dggs.setDggs(grid({ projection }), res);
                expect(dggs.nCells(res)).toBe(2 + 10 * 4 ** res);

                // away from the antimeridian, so the rings need no unwrapping
                const pts = PTS.filter(([lng]) => Math.abs(lng) < 170);
                const cells = dggs.geoToSequenceNum(pts, res);
                const rings = dggs.sequenceNumToGrid(cells, res, false);
                rings.forEach((ring, i) => { expect(inRing(pts[i], ring)).toBe(true); });
            });
        }

        test('IVEA and GNOMONIC grids differ from ISEA', () => {
            const res = 5;
            const center = (projection: Projection) => {
                dggs.setDggs(grid({ projection }), res);
                return dggs.sequenceNumToGeo([1000n], res)[0];
            };
            const isea = center(Projection.ISEA);
            expect(center(Projection.IVEA)).not.toEqual(isea);
            expect(center(Projection.GNOMONIC)).not.toEqual(isea);
        });

        test('an unknown projection is rejected', () => {
            dggs.setDggs(grid({ projection: 'MERCATOR' as Projection }), 3);
            expect(() => dggs.nCells(3)).toThrow(/Unknown projection 'MERCATOR'/);
        });
    });

    describe('WGS84 datum', () => {
        const res = 6;
        const sphere = () => grid({ aperture: 7 });
        const wgs84 = () => grid({ aperture: 7, datum: Datum.WGS84 });

        test('input is the authalic latitude of the WGS84 point', () => {
            dggs.setDggs(wgs84(), res);
            const cells = dggs.geoToSequenceNum(PTS, res);

            dggs.setDggs(sphere(), res);
            const authalic = PTS.map(([lng, lat]) => [lng, dggs.igeo7GeoToAuthalic(lat)]);
            expect(dggs.geoToSequenceNum(authalic, res)).toEqual(cells);
        });

        test('cell centres and vertices are returned as WGS84', () => {
            dggs.setDggs(sphere(), res);
            const cell = dggs.geoToSequenceNum([[10, 45]], res);
            const sphCenter = dggs.sequenceNumToGeo(cell, res)[0];
            const sphRing = dggs.sequenceNumToGrid(cell, res, false)[0];

            dggs.setDggs(wgs84(), res);
            const center = dggs.sequenceNumToGeo(cell, res)[0];
            const ring = dggs.sequenceNumToGrid(cell, res, false)[0];

            expect(center[0]).toBeCloseTo(sphCenter[0], 10);
            expect(center[1]).toBeCloseTo(dggs.igeo7AuthalicToGeo(sphCenter[1]), 7);
            expect(ring).toHaveLength(sphRing.length);
            ring.forEach(([lng, lat], i) => {
                expect(lng).toBeCloseTo(sphRing[i][0], 10);
                expect(lat).toBeCloseTo(dggs.igeo7AuthalicToGeo(sphRing[i][1]), 7);
            });
            // at 45° the geodetic latitude is ~0.13° north of the authalic one
            expect(center[1] - sphCenter[1]).toBeGreaterThan(0.1);
        });

        test('WGS84 round-trips through cell centres', () => {
            dggs.setDggs(wgs84(), res);
            const cells = dggs.geoToSequenceNum(PTS, res);
            const centers = dggs.sequenceNumToGeo(cells, res);
            expect(dggs.geoToSequenceNum(centers, res)).toEqual(cells);
        });

        test('an unknown datum is rejected', () => {
            dggs.setDggs(grid({ datum: 'NAD27' as Datum }), 3);
            expect(() => dggs.nCells(3)).toThrow(/Unknown datum 'NAD27'/);
        });
    });

    describe('sphere radius', () => {
        test('cell area scales with the square of the radius', () => {
            dggs.setDggs(grid(), 4);
            const earth = dggs.cellAreaKM(4);
            dggs.setDggs(grid({ sphereRadiusKm: 1737.4 }), 4);
            expect(dggs.cellAreaKM(4) / earth).toBeCloseTo((1737.4 / AUTHALIC_RADIUS_KM) ** 2, 9);
            expect(dggs.nCells(4)).toBe(2562);
        });

        test('0 is the WGS84 authalic sphere', () => {
            dggs.setDggs(grid({ sphereRadiusKm: AUTHALIC_RADIUS_KM }), 3);
            const custom = dggs.cellAreaKM(3);
            dggs.setDggs(grid({ sphereRadiusKm: 0 }), 3);
            expect(dggs.cellAreaKM(3)).toBeCloseTo(custom, 6);
        });

        test('out of range radius and WGS84 on a custom sphere are rejected', () => {
            dggs.setDggs(grid({ sphereRadiusKm: 0.5 }), 3);
            expect(() => dggs.nCells(3)).toThrow(/sphere_radius_km/);
            dggs.setDggs(grid({ sphereRadiusKm: 6000, datum: Datum.WGS84 }), 3);
            expect(() => dggs.nCells(3)).toThrow(/WGS84 requires the authalic sphere/);
        });
    });

    describe('orientation presets', () => {
        test('values match DGGRID', () => {
            expect(orientationPreset(OrientationPreset.ISEA)).toEqual({
                poleCoordinates: { lat: 58.282525588538995, lng: 11.25 }, azimuth: 0,
            });
            expect(orientationPreset(OrientationPreset.ISEAL).poleCoordinates.lng).toBe(11.2);
            expect(orientationPreset(OrientationPreset.DYMAXION)).toEqual({
                poleCoordinates: { lat: 64.70000012793489, lng: 10.536199075467637 },
                azimuth: 125.68765089354628,
            });
        });

        test('returns a copy', () => {
            orientationPreset(OrientationPreset.ISEA).poleCoordinates.lat = 0;
            expect(orientationPreset(OrientationPreset.ISEA).poleCoordinates.lat).not.toBe(0);
        });
    });

    describe('preset grids', () => {
        const cases: Array<[DggsPresetName, Partial<IDGGSProps>, OrientationPreset]> = [
            ['ISEA4H', { aperture: 4, topology: Topology.HEXAGON, projection: Projection.ISEA, datum: Datum.AUTHALIC_SPHERE }, OrientationPreset.ISEA],
            ['ISEA3HS', { aperture: 3, topology: Topology.HEXAGON, projection: Projection.ISEA, datum: Datum.AUTHALIC_SPHERE }, OrientationPreset.ISEA],
            ['IVEA7HL', { aperture: 7, topology: Topology.HEXAGON, projection: Projection.IVEA, datum: Datum.WGS84 }, OrientationPreset.ISEAL],
            ['ISEA4TL', { aperture: 4, topology: Topology.TRIANGLE, projection: Projection.ISEA, datum: Datum.WGS84 }, OrientationPreset.ISEAL],
            ['IVEA4DS', { aperture: 4, topology: Topology.DIAMOND, projection: Projection.IVEA, datum: Datum.AUTHALIC_SPHERE }, OrientationPreset.ISEA],
            ['ISEA7HSZ', { aperture: 7, topology: Topology.HEXAGON, projection: Projection.ISEA, datum: Datum.AUTHALIC_SPHERE }, OrientationPreset.ISEA],
            ['FULLER4D', { aperture: 4, topology: Topology.DIAMOND, projection: Projection.FULLER, datum: Datum.AUTHALIC_SPHERE }, OrientationPreset.DYMAXION],
            ['IGEO7v1', { aperture: 7, topology: Topology.HEXAGON, projection: Projection.ISEA, datum: Datum.AUTHALIC_SPHERE }, OrientationPreset.ISEA],
            ['IGEO7v2', { aperture: 7, topology: Topology.HEXAGON, projection: Projection.ISEA, datum: Datum.WGS84 }, OrientationPreset.ISEAL],
        ];

        test.each(cases)('%s', (name, props, orientation) => {
            const p = dggsPreset(name);
            expect(p).toEqual({ ...orientationPreset(orientation), ...props });
            dggs.setDggs(p, 3);
            expect(dggs.nCells(3)).toBeGreaterThan(0);
            expect(dggs.geoToSequenceNum(PTS, 3)).toHaveLength(PTS.length);
        });

        test('PLANETRISK is an aperture sequence grid', () => {
            const p = dggsPreset('PLANETRISK');
            expect(p.apertureSequence).toBe('43334777777777777777777');
            dggs.setDggs(p, 4);
            expect(dggs.nCells(4)).toBe(2 + 10 * 4 * 3 * 3 * 3);
        });

        test('names are case-insensitive', () => {
            expect(dggsPreset('isea7hlz' as DggsPresetName)).toEqual(dggsPreset('ISEA7HLZ'));
        });

        test.each(['IGEO7', 'ISEA43H', 'SUPERFUND', 'H3', 'ISEA3T', 'FULLER4HS', 'ISEA4DSZ', 'ISEA7HZ'])(
            '%s is rejected', (name) => {
                expect(() => dggsPreset(name as DggsPresetName)).toThrow();
            });
    });
});
