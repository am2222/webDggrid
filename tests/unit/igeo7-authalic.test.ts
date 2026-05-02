import { describe, test, beforeAll, expect } from 'vitest';
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon, GeometryCollection } from 'geojson';
import { Webdggrid } from '../../lib-esm/webdggrid';

// Reference values from submodules/igeo7_duckdb/test/test_auth.cpp.
// Tolerance matches the upstream C++ check (1e-7 deg).
const REFERENCE: Array<[number, number]> = [
    [-90.0, -90.0],
    [-45.0, -44.87170287],
    [0.0, 0.0],
    [30.0, 29.88899703],
    [58.39714590, 58.28252559],
    [60.0, 59.88878556],
    [89.9999, 89.99989955],
    [90.0, 90.0],
];

describe('IGEO7 authalic latitude conversion', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    describe('scalar geo ↔ authalic', () => {
        test.each(REFERENCE)('geodetic %f° → authalic %f°', (phi, expected) => {
            expect(dggs.igeo7GeoToAuthalic(phi)).toBeCloseTo(expected, 6);
        });

        test.each(REFERENCE)('authalic %f° (xi) → geodetic %f° (phi)', (phi, xi) => {
            expect(dggs.igeo7AuthalicToGeo(xi)).toBeCloseTo(phi, 6);
        });

        test('round-trip recovers input within 1e-9°', () => {
            for (const [phi] of REFERENCE) {
                const xi = dggs.igeo7GeoToAuthalic(phi);
                const back = dggs.igeo7AuthalicToGeo(xi);
                expect(Math.abs(back - phi)).toBeLessThan(1e-9);
            }
        });

        test('odd symmetry: f(-x) === -f(x)', () => {
            for (const phi of [10, 30, 45, 60, 75, 89.5]) {
                expect(dggs.igeo7GeoToAuthalic(-phi)).toBeCloseTo(-dggs.igeo7GeoToAuthalic(phi), 12);
            }
        });

        test('poles and equator are fixed points', () => {
            expect(dggs.igeo7GeoToAuthalic(0)).toBeCloseTo(0, 12);
            expect(dggs.igeo7GeoToAuthalic(90)).toBeCloseTo(90, 9);
            expect(dggs.igeo7GeoToAuthalic(-90)).toBeCloseTo(-90, 9);
            expect(dggs.igeo7AuthalicToGeo(0)).toBeCloseTo(0, 12);
            expect(dggs.igeo7AuthalicToGeo(90)).toBeCloseTo(90, 9);
            expect(dggs.igeo7AuthalicToGeo(-90)).toBeCloseTo(-90, 9);
        });
    });

    describe('GeoJSON transform (igeo7TransformGeoJson)', () => {
        test('Point: transforms lat, leaves lng untouched', () => {
            const point: Point = { type: 'Point', coordinates: [12.5, 45] };
            const out = dggs.igeo7TransformGeoJson(point);
            expect(out.type).toBe('Point');
            expect(out.coordinates[0]).toBe(12.5);
            expect(out.coordinates[1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(45), 12);
        });

        test('Point with z/m trailing dimensions: trailing values pass through', () => {
            const point = { type: 'Point' as const, coordinates: [12.5, 45, 100, 7] };
            const out = dggs.igeo7TransformGeoJson(point);
            expect(out.coordinates[0]).toBe(12.5);
            expect(out.coordinates[1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(45), 12);
            expect(out.coordinates[2]).toBe(100);
            expect(out.coordinates[3]).toBe(7);
        });

        test('Polygon with hole: every ring vertex transformed, hole preserved', () => {
            const poly: Polygon = {
                type: 'Polygon',
                coordinates: [
                    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
                    [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]],
                ],
            };
            const out = dggs.igeo7TransformGeoJson(poly);
            expect(out.coordinates.length).toBe(2);
            expect(out.coordinates[0].length).toBe(5);
            expect(out.coordinates[1].length).toBe(5);
            // Spot-check a non-equator vertex
            expect(out.coordinates[0][2][0]).toBe(10);
            expect(out.coordinates[0][2][1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(10), 12);
            // Lat 0 stays at 0
            expect(out.coordinates[0][0][1]).toBeCloseTo(0, 12);
        });

        test('MultiPolygon: walks all polygons and rings', () => {
            const mp: MultiPolygon = {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0, 30], [5, 30], [5, 35], [0, 30]]],
                    [[[20, -45], [25, -45], [25, -40], [20, -45]]],
                ],
            };
            const out = dggs.igeo7TransformGeoJson(mp);
            expect(out.coordinates[0][0][0][1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(30), 12);
            expect(out.coordinates[1][0][0][1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(-45), 12);
        });

        test('Feature: preserves id and properties, transforms geometry', () => {
            const feat: Feature<Point> = {
                type: 'Feature',
                id: 'cell-42',
                properties: { name: 'sample', id: 42 },
                geometry: { type: 'Point', coordinates: [3, 60] },
            };
            const out = dggs.igeo7TransformGeoJson(feat);
            expect(out.id).toBe('cell-42');
            expect(out.properties).toEqual({ name: 'sample', id: 42 });
            expect(out.geometry?.coordinates[1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(60), 12);
        });

        test('FeatureCollection: walks every feature', () => {
            const fc: FeatureCollection<Point> = {
                type: 'FeatureCollection',
                features: [
                    { type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [0, 30] } },
                    { type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [0, -45] } },
                ],
            };
            const out = dggs.igeo7TransformGeoJson(fc);
            expect(out.features).toHaveLength(2);
            expect(out.features[0].geometry?.coordinates[1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(30), 12);
            expect(out.features[1].geometry?.coordinates[1]).toBeCloseTo(dggs.igeo7GeoToAuthalic(-45), 12);
        });

        test('GeometryCollection: walks nested geometries', () => {
            const gc: GeometryCollection = {
                type: 'GeometryCollection',
                geometries: [
                    { type: 'Point', coordinates: [0, 30] },
                    { type: 'LineString', coordinates: [[0, 0], [10, 45]] },
                ],
            };
            const out = dggs.igeo7TransformGeoJson(gc);
            expect((out.geometries[0] as Point).coordinates[1])
                .toBeCloseTo(dggs.igeo7GeoToAuthalic(30), 12);
            expect((out.geometries[1] as any).coordinates[1][1])
                .toBeCloseTo(dggs.igeo7GeoToAuthalic(45), 12);
        });

        test('null geometry on Feature: feature returned, geometry stays null', () => {
            // The GeoJSON spec allows null geometries on Features even though
            // @types/geojson types Feature.geometry as Geometry.
            const feat = {
                type: 'Feature' as const,
                properties: { foo: 'bar' },
                geometry: null,
            };
            const out = dggs.igeo7TransformGeoJson(feat as unknown as Feature);
            expect(out.type).toBe('Feature');
            expect(out.geometry).toBeNull();
            expect(out.properties).toEqual({ foo: 'bar' });
        });

        test('does NOT mutate input', () => {
            const point: Point = { type: 'Point', coordinates: [12.5, 45] };
            const snapshot = JSON.stringify(point);
            dggs.igeo7TransformGeoJson(point);
            expect(JSON.stringify(point)).toBe(snapshot);
        });

        test('round-trip on a Feature recovers original within 1e-9°', () => {
            const fc: FeatureCollection<Polygon> = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: null,
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-122.4, 37.7],
                            [-122.3, 37.7],
                            [-122.3, 37.8],
                            [-122.4, 37.8],
                            [-122.4, 37.7],
                        ]],
                    },
                }],
            };
            const forward = dggs.igeo7TransformGeoJson(fc, 'geoToAuthalic');
            const back = dggs.igeo7TransformGeoJson(forward, 'authalicToGeo');
            const orig = fc.features[0].geometry.coordinates[0];
            const recovered = back.features[0].geometry.coordinates[0];
            for (let i = 0; i < orig.length; i++) {
                expect(recovered[i][0]).toBe(orig[i][0]);          // lng untouched
                expect(Math.abs(recovered[i][1] - orig[i][1])).toBeLessThan(1e-9);
            }
        });

        test('unsupported geometry type passes through unchanged', () => {
            const weird: any = { type: 'NotAType', coordinates: [[0, 30]] };
            const out = dggs.igeo7TransformGeoJson(weird);
            expect(out).toEqual(weird);
        });
    });
});
