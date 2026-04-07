import { expect, test, describe, beforeAll } from 'vitest';
import { Webdggrid, Topology, Projection } from '../../lib-esm/webdggrid';

describe('Coordinate Transformation Methods', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            aperture: 4,
            topology: Topology.HEXAGON,
            projection: Projection.ISEA,
        }, 5);
    });

    describe('GEO transformations', () => {
        const testCoords = [[0, 0], [10, 20]];

        test('geoToPlane returns plane coordinates', () => {
            const result = dggs.geoToPlane(testCoords, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
            expect(typeof result[0].x).toBe('number');
            expect(typeof result[0].y).toBe('number');
        });

        test('geoToProjtri returns projection triangle coordinates', () => {
            const result = dggs.geoToProjtri(testCoords, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('tnum');
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
            expect(typeof result[0].tnum).toBe('number');
        });

        test('geoToQ2dd returns quad 2D double coordinates', () => {
            const result = dggs.geoToQ2dd(testCoords, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
            expect(typeof result[0].quad).toBe('number');
        });

        test('geoToQ2di returns quad 2D integer coordinates', () => {
            const result = dggs.geoToQ2di(testCoords, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('i');
            expect(result[0]).toHaveProperty('j');
            expect(typeof result[0].i).toBe('bigint');
            expect(typeof result[0].j).toBe('bigint');
        });
    });

    describe('SEQNUM transformations', () => {
        const testSeqnums = [1n, 100n];

        test('sequenceNumToPlane returns plane coordinates', () => {
            const result = dggs.sequenceNumToPlane(testSeqnums, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
        });

        test('sequenceNumToProjtri returns projection triangle coordinates', () => {
            const result = dggs.sequenceNumToProjtri(testSeqnums, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('tnum');
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
        });

        test('sequenceNumToQ2dd returns quad 2D double coordinates', () => {
            const result = dggs.sequenceNumToQ2dd(testSeqnums, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
        });

        test('sequenceNumToQ2di returns quad 2D integer coordinates', () => {
            const result = dggs.sequenceNumToQ2di(testSeqnums, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('i');
            expect(result[0]).toHaveProperty('j');
            expect(typeof result[0].i).toBe('bigint');
            expect(typeof result[0].j).toBe('bigint');
        });
    });

    describe('Q2DI transformations', () => {
        test('q2diToGeo converts to geographic coordinates', () => {
            const q2di = [{ quad: 0, i: 0n, j: 0n }];
            const result = dggs.q2diToGeo(q2di, 5);
            expect(result).toHaveLength(1);
            expect(Array.isArray(result[0])).toBe(true);
            expect(result[0]).toHaveLength(2);
        });

        test('q2diToSequenceNum converts to sequence numbers', () => {
            const q2di = [{ quad: 0, i: 0n, j: 0n }];
            const result = dggs.q2diToSequenceNum(q2di, 5);
            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('bigint');
        });

        test('q2diToPlane converts to plane coordinates', () => {
            const q2di = [{ quad: 0, i: 0n, j: 0n }];
            const result = dggs.q2diToPlane(q2di, 5);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
        });

        test('q2diToQ2dd converts to Q2DD coordinates', () => {
            const q2di = [{ quad: 0, i: 0n, j: 0n }];
            const result = dggs.q2diToQ2dd(q2di, 5);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
        });
    });

    describe('Q2DD transformations', () => {
        test('q2ddToGeo converts to geographic coordinates', () => {
            const q2dd = [{ quad: 0, x: 0.5, y: 0.5 }];
            const result = dggs.q2ddToGeo(q2dd, 5);
            expect(result).toHaveLength(1);
            expect(Array.isArray(result[0])).toBe(true);
            expect(result[0]).toHaveLength(2);
        });

        test('q2ddToSequenceNum converts to sequence numbers', () => {
            const q2dd = [{ quad: 0, x: 0.5, y: 0.5 }];
            const result = dggs.q2ddToSequenceNum(q2dd, 5);
            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('bigint');
        });

        test('q2ddToQ2di converts to Q2DI coordinates', () => {
            const q2dd = [{ quad: 0, x: 0.5, y: 0.5 }];
            const result = dggs.q2ddToQ2di(q2dd, 5);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('i');
            expect(result[0]).toHaveProperty('j');
            expect(typeof result[0].i).toBe('bigint');
        });
    });

    describe('PROJTRI transformations', () => {
        test('projtriToGeo converts to geographic coordinates', () => {
            const projtri = [{ tnum: 0, x: 0.5, y: 0.5 }];
            const result = dggs.projtriToGeo(projtri, 5);
            expect(result).toHaveLength(1);
            expect(Array.isArray(result[0])).toBe(true);
            expect(result[0]).toHaveLength(2);
        });

        test('projtriToSequenceNum converts to sequence numbers', () => {
            const projtri = [{ tnum: 0, x: 0.5, y: 0.5 }];
            const result = dggs.projtriToSequenceNum(projtri, 5);
            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('bigint');
        });

        test('projtriToQ2dd converts to Q2DD coordinates', () => {
            const projtri = [{ tnum: 0, x: 0.5, y: 0.5 }];
            const result = dggs.projtriToQ2dd(projtri, 5);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('quad');
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
        });
    });

    describe('Round-trip transformations', () => {
        test('GEO -> Q2DI -> GEO returns same coordinates', () => {
            const original = [[0, 0]];
            const q2di = dggs.geoToQ2di(original, 5);
            const result = dggs.q2diToGeo(q2di, 5);

            // Should be close (within cell resolution)
            expect(result[0][0]).toBeCloseTo(original[0][0], 1);
            expect(result[0][1]).toBeCloseTo(original[0][1], 1);
        });

        test('GEO -> SEQNUM -> Q2DI -> SEQNUM returns same sequence number', () => {
            const coords = [[0, 0]];
            const seqnum1 = dggs.geoToSequenceNum(coords, 5);
            const q2di = dggs.sequenceNumToQ2di(seqnum1, 5);
            const seqnum2 = dggs.q2diToSequenceNum(q2di, 5);

            expect(seqnum2[0]).toBe(seqnum1[0]);
        });
    });

    describe('Q2DI to Geometry workflow', () => {
        test('Q2DI -> SEQNUM -> GeoJSON produces valid geometry', () => {
            // Start with Q2DI coordinates
            const q2di = [{ quad: 0, i: 0n, j: 0n }, { quad: 0, i: 5n, j: 3n }];

            // Convert to sequence numbers
            const seqnums = dggs.q2diToSequenceNum(q2di, 5);
            expect(seqnums).toHaveLength(2);

            // Generate GeoJSON geometry
            const geojson = dggs.sequenceNumToGridFeatureCollection(seqnums, 5);
            expect(geojson.type).toBe('FeatureCollection');
            expect(geojson.features).toHaveLength(2);
            expect(geojson.features[0].geometry.type).toBe('Polygon');
            expect(geojson.features[0].geometry.coordinates[0].length).toBeGreaterThanOrEqual(6);
        });
    });
});
