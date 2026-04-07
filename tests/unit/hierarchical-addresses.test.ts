import { describe, test, beforeAll, expect } from 'vitest';
import { Webdggrid, Topology } from '../../lib-esm/webdggrid';

describe('Hierarchical Address Types', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    describe('VERTEX2DD', () => {
        test('converts SEQNUM to VERTEX2DD and back', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);

            const seqnum = 100n;
            const vertex = dggs.sequenceNumToVertex2DD(seqnum, 5);

            expect(vertex).toBeDefined();
            expect(typeof vertex.keep).toBe('boolean');
            expect(typeof vertex.vertNum).toBe('number');
            expect(typeof vertex.triNum).toBe('number');
            expect(typeof vertex.x).toBe('number');
            expect(typeof vertex.y).toBe('number');

            // Round-trip conversion
            const backToSeqnum = dggs.vertex2DDToSequenceNum(
                vertex.keep,
                vertex.vertNum,
                vertex.triNum,
                vertex.x,
                vertex.y,
                5
            );

            expect(backToSeqnum).toBe(seqnum);
        });

        test('works with different apertures', () => {
            // Test aperture 3
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 4);

            const vertex3 = dggs.sequenceNumToVertex2DD(50n, 4);
            expect(vertex3).toBeDefined();

            // Test aperture 7
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 4);

            const vertex7 = dggs.sequenceNumToVertex2DD(50n, 4);
            expect(vertex7).toBeDefined();
        });

        test('maintains consistency across multiple cells', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);

            const seqnums = [10n, 20n, 30n, 40n, 50n];

            for (const seqnum of seqnums) {
                const vertex = dggs.sequenceNumToVertex2DD(seqnum, 5);
                const backToSeqnum = dggs.vertex2DDToSequenceNum(
                    vertex.keep,
                    vertex.vertNum,
                    vertex.triNum,
                    vertex.x,
                    vertex.y,
                    5
                );
                expect(backToSeqnum).toBe(seqnum);
            }
        });
    });

    describe('ZORDER', () => {
        test('converts SEQNUM to ZORDER and back (aperture 3)', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            const seqnum = 100n;
            const zorder = dggs.sequenceNumToZOrder(seqnum, 5);

            expect(typeof zorder).toBe('bigint');
            expect(zorder).toBeGreaterThan(0n);

            const backToSeqnum = dggs.zOrderToSequenceNum(zorder, 5);
            expect(backToSeqnum).toBe(seqnum);
        });

        test('converts SEQNUM to ZORDER and back (aperture 4)', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);

            const seqnum = 100n;
            const zorder = dggs.sequenceNumToZOrder(seqnum, 5);

            expect(typeof zorder).toBe('bigint');
            expect(zorder).toBeGreaterThan(0n);

            const backToSeqnum = dggs.zOrderToSequenceNum(zorder, 5);
            expect(backToSeqnum).toBe(seqnum);
        });

        test('throws error for aperture 7', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            expect(() => {
                dggs.sequenceNumToZOrder(100n, 5);
            }).toThrow(/ZORDER.*aperture 7/);

            expect(() => {
                dggs.zOrderToSequenceNum(100n, 5);
            }).toThrow(/ZORDER.*aperture 7/);
        });

        test('maintains uniqueness across cells', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);

            const seqnums = [10n, 20n, 30n, 40n, 50n];
            const zorders = seqnums.map(s => dggs.sequenceNumToZOrder(s, 5));

            // All ZORDER values should be unique
            const uniqueZorders = new Set(zorders);
            expect(uniqueZorders.size).toBe(zorders.length);
        });
    });

    describe('Z3', () => {
        test('converts SEQNUM to Z3 and back (aperture 3)', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            const seqnum = 100n;
            const z3 = dggs.sequenceNumToZ3(seqnum, 5);

            expect(typeof z3).toBe('bigint');
            expect(z3).toBeGreaterThan(0n);

            const backToSeqnum = dggs.z3ToSequenceNum(z3, 5);
            expect(backToSeqnum).toBe(seqnum);
        });

        test('throws error for aperture 4', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);

            expect(() => {
                dggs.sequenceNumToZ3(100n, 5);
            }).toThrow(/Z3.*aperture 3/);
        });

        test('throws error for aperture 7', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            expect(() => {
                dggs.sequenceNumToZ3(100n, 5);
            }).toThrow(/Z3.*aperture 3/);
        });

        test('maintains consistency across resolutions', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            const resolutions = [3, 4, 5, 6];

            for (const res of resolutions) {
                const z3 = dggs.sequenceNumToZ3(10n, res);
                const backToSeqnum = dggs.z3ToSequenceNum(z3, res);
                expect(backToSeqnum).toBe(10n);
            }
        });

        test('Z3 values are hierarchically organized', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            // Get a parent cell
            const parentSeqnum = 25n;
            const parentZ3 = dggs.sequenceNumToZ3(parentSeqnum, 4);

            // Get its children
            const children = dggs.sequenceNumChildren([parentSeqnum], 4);
            const childZ3s = children[0].map(c => dggs.sequenceNumToZ3(c, 5));

            // All children should have different Z3 values
            const uniqueChildZ3s = new Set(childZ3s);
            expect(uniqueChildZ3s.size).toBe(childZ3s.length);
        });
    });

    describe('Z7', () => {
        test('converts SEQNUM to Z7 and back (aperture 7)', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            const seqnum = 100n;
            const z7 = dggs.sequenceNumToZ7(seqnum, 5);

            expect(typeof z7).toBe('bigint');
            expect(z7).toBeGreaterThan(0n);

            const backToSeqnum = dggs.z7ToSequenceNum(z7, 5);
            expect(backToSeqnum).toBe(seqnum);
        });

        test('throws error for aperture 3', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            expect(() => {
                dggs.sequenceNumToZ7(100n, 5);
            }).toThrow(/Z7.*aperture 7/);
        });

        test('throws error for aperture 4', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);

            expect(() => {
                dggs.sequenceNumToZ7(100n, 5);
            }).toThrow(/Z7.*aperture 7/);
        });

        test('maintains consistency across resolutions', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            const resolutions = [3, 4, 5, 6];

            for (const res of resolutions) {
                const z7 = dggs.sequenceNumToZ7(10n, res);
                const backToSeqnum = dggs.z7ToSequenceNum(z7, res);
                expect(backToSeqnum).toBe(10n);
            }
        });

        test('Z7 values are hierarchically organized', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            // Get a parent cell
            const parentSeqnum = 25n;
            const parentZ7 = dggs.sequenceNumToZ7(parentSeqnum, 4);

            // Get its children
            const children = dggs.sequenceNumChildren([parentSeqnum], 4);
            const childZ7s = children[0].map(c => dggs.sequenceNumToZ7(c, 5));

            // All children should have different Z7 values
            const uniqueChildZ7s = new Set(childZ7s);
            expect(uniqueChildZ7s.size).toBe(childZ7s.length);
        });

        test('handles large Z7 values correctly', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 8);

            // Test with higher resolution for larger values
            const seqnum = 1000000n;
            const z7 = dggs.sequenceNumToZ7(seqnum, 8);
            const backToSeqnum = dggs.z7ToSequenceNum(z7, 8);

            expect(backToSeqnum).toBe(seqnum);
        });
    });

    describe('Integration Tests', () => {
        test('all hierarchical types work together', () => {
            // Test aperture 3 with Z3 and ZORDER
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            const seqnum3 = 50n;
            const z3 = dggs.sequenceNumToZ3(seqnum3, 5);
            const zorder3 = dggs.sequenceNumToZOrder(seqnum3, 5);
            const vertex3 = dggs.sequenceNumToVertex2DD(seqnum3, 5);

            expect(dggs.z3ToSequenceNum(z3, 5)).toBe(seqnum3);
            expect(dggs.zOrderToSequenceNum(zorder3, 5)).toBe(seqnum3);
            expect(dggs.vertex2DDToSequenceNum(
                vertex3.keep, vertex3.vertNum, vertex3.triNum, vertex3.x, vertex3.y, 5
            )).toBe(seqnum3);
        });

        test('hierarchical indices preserve parent-child relationships', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 4);

            // Get a cell and its parent
            const childSeqnum = 100n;
            const parentSeqnum = dggs.sequenceNumParent([childSeqnum], 5)[0];

            // Convert both to Z3
            const childZ3 = dggs.sequenceNumToZ3(childSeqnum, 5);
            const parentZ3 = dggs.sequenceNumToZ3(parentSeqnum, 4);

            // Both should be valid and convertible back
            expect(dggs.z3ToSequenceNum(childZ3, 5)).toBe(childSeqnum);
            expect(dggs.z3ToSequenceNum(parentZ3, 4)).toBe(parentSeqnum);
        });

        test('error messages are descriptive', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            // ZORDER should fail with helpful message
            try {
                dggs.sequenceNumToZOrder(100n, 5);
                expect.fail('Should have thrown');
            } catch (e: any) {
                expect(e.message).toContain('ZORDER');
                expect(e.message).toContain('aperture 7');
                expect(e.message).toContain('Z7');
            }

            // Z3 should fail with helpful message
            try {
                dggs.sequenceNumToZ3(100n, 5);
                expect.fail('Should have thrown');
            } catch (e: any) {
                expect(e.message).toContain('Z3');
                expect(e.message).toContain('aperture 3');
            }
        });
    });
});
