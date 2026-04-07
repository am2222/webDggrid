import { describe, test, beforeAll, expect } from 'vitest';
import { Webdggrid, Topology } from '../../lib-esm/webdggrid';

describe('Index Digit Manipulation', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    // -----------------------------------------------------------------------
    // Z7 digit operations
    // -----------------------------------------------------------------------
    describe('Z7 digits (aperture 7)', () => {
        beforeAll(() => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);
        });

        test('z7GetQuad returns valid quad number', () => {
            const z7 = dggs.sequenceNumToZ7(100n, 5);
            const quad = dggs.z7GetQuad(z7);
            expect(quad).toBeGreaterThanOrEqual(0);
            expect(quad).toBeLessThanOrEqual(11);
        });

        test('z7GetDigit returns values 0-6 for active resolutions', () => {
            const z7 = dggs.sequenceNumToZ7(100n, 5);
            for (let r = 1; r <= 5; r++) {
                const digit = dggs.z7GetDigit(z7, r);
                expect(digit).toBeGreaterThanOrEqual(0);
                expect(digit).toBeLessThanOrEqual(6);
            }
        });

        test('z7GetDigit returns 7 (invalid) for unused resolutions', () => {
            const z7 = dggs.sequenceNumToZ7(100n, 5);
            for (let r = 6; r <= 20; r++) {
                expect(dggs.z7GetDigit(z7, r)).toBe(7);
            }
        });

        test('z7SetDigit modifies a single digit without affecting others', () => {
            const z7 = dggs.sequenceNumToZ7(100n, 5);
            const modified = dggs.z7SetDigit(z7, 3, 5);

            // Quad unchanged
            expect(dggs.z7GetQuad(modified)).toBe(dggs.z7GetQuad(z7));
            // Digit 3 changed
            expect(dggs.z7GetDigit(modified, 3)).toBe(5);
            // Other digits unchanged
            expect(dggs.z7GetDigit(modified, 1)).toBe(dggs.z7GetDigit(z7, 1));
            expect(dggs.z7GetDigit(modified, 2)).toBe(dggs.z7GetDigit(z7, 2));
            expect(dggs.z7GetDigit(modified, 4)).toBe(dggs.z7GetDigit(z7, 4));
            expect(dggs.z7GetDigit(modified, 5)).toBe(dggs.z7GetDigit(z7, 5));
        });

        test('z7ExtractDigits returns correct quad and digit array', () => {
            const z7 = dggs.sequenceNumToZ7(100n, 5);
            const { quad, digits } = dggs.z7ExtractDigits(z7, 5);

            expect(quad).toBe(dggs.z7GetQuad(z7));
            expect(digits).toHaveLength(5);
            for (let i = 0; i < 5; i++) {
                expect(digits[i]).toBe(dggs.z7GetDigit(z7, i + 1));
            }
        });

        test('parent shares all digits except the last', () => {
            const seqnum = 100n;
            const z7 = dggs.sequenceNumToZ7(seqnum, 5);
            const parentSeq = dggs.sequenceNumParent([seqnum], 5)[0];
            const parentZ7 = dggs.sequenceNumToZ7(parentSeq, 4);

            // Same quad
            expect(dggs.z7GetQuad(parentZ7)).toBe(dggs.z7GetQuad(z7));

            // Digits 1-4 match
            for (let r = 1; r <= 4; r++) {
                expect(dggs.z7GetDigit(parentZ7, r)).toBe(dggs.z7GetDigit(z7, r));
            }
        });

        test('children have valid Z7 values with active digit at child resolution', () => {
            const seqnum = 100n;
            const children = dggs.sequenceNumChildren([seqnum], 5)[0];

            expect(children.length).toBeGreaterThanOrEqual(1);

            for (const child of children) {
                const childZ7 = dggs.sequenceNumToZ7(child, 6);

                // Digit at res 6 should be valid (0-6, not 7)
                const d6 = dggs.z7GetDigit(childZ7, 6);
                expect(d6).toBeGreaterThanOrEqual(0);
                expect(d6).toBeLessThanOrEqual(6);

                // Round-trip check
                const backToSeq = dggs.z7ToSequenceNum(childZ7, 6);
                expect(backToSeq).toBe(child);
            }
        });
    });

    // -----------------------------------------------------------------------
    // Z3 digit operations
    // -----------------------------------------------------------------------
    describe('Z3 digits (aperture 3)', () => {
        beforeAll(() => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);
        });

        test('z3GetQuad returns valid quad number', () => {
            const z3 = dggs.sequenceNumToZ3(50n, 5);
            const quad = dggs.z3GetQuad(z3);
            expect(quad).toBeGreaterThanOrEqual(0);
            expect(quad).toBeLessThanOrEqual(11);
        });

        test('z3GetDigit returns values 0-2 for active resolutions', () => {
            const z3 = dggs.sequenceNumToZ3(50n, 5);
            for (let r = 1; r <= 5; r++) {
                const digit = dggs.z3GetDigit(z3, r);
                expect(digit).toBeGreaterThanOrEqual(0);
                expect(digit).toBeLessThanOrEqual(2);
            }
        });

        test('z3GetDigit returns 3 (invalid) for unused resolutions', () => {
            const z3 = dggs.sequenceNumToZ3(50n, 5);
            for (let r = 6; r <= 30; r++) {
                expect(dggs.z3GetDigit(z3, r)).toBe(3);
            }
        });

        test('z3SetDigit modifies a single digit without affecting others', () => {
            const z3 = dggs.sequenceNumToZ3(50n, 5);
            const modified = dggs.z3SetDigit(z3, 3, 2);

            expect(dggs.z3GetQuad(modified)).toBe(dggs.z3GetQuad(z3));
            expect(dggs.z3GetDigit(modified, 3)).toBe(2);
            expect(dggs.z3GetDigit(modified, 1)).toBe(dggs.z3GetDigit(z3, 1));
            expect(dggs.z3GetDigit(modified, 2)).toBe(dggs.z3GetDigit(z3, 2));
            expect(dggs.z3GetDigit(modified, 4)).toBe(dggs.z3GetDigit(z3, 4));
        });

        test('z3ExtractDigits returns correct quad and digit array', () => {
            const z3 = dggs.sequenceNumToZ3(50n, 5);
            const { quad, digits } = dggs.z3ExtractDigits(z3, 5);

            expect(quad).toBe(dggs.z3GetQuad(z3));
            expect(digits).toHaveLength(5);
            for (let i = 0; i < 5; i++) {
                expect(digits[i]).toBe(dggs.z3GetDigit(z3, i + 1));
            }
        });

        test('parent Z3 has valid digits at coarser resolution', () => {
            const seqnum = 50n;
            const parentSeq = dggs.sequenceNumParent([seqnum], 5)[0];
            const parentZ3 = dggs.sequenceNumToZ3(parentSeq, 4);

            const quad = dggs.z3GetQuad(parentZ3);
            expect(quad).toBeGreaterThanOrEqual(0);
            expect(quad).toBeLessThanOrEqual(11);

            for (let r = 1; r <= 4; r++) {
                const digit = dggs.z3GetDigit(parentZ3, r);
                expect(digit).toBeGreaterThanOrEqual(0);
                expect(digit).toBeLessThanOrEqual(2);
            }
            // Unused slots should be invalid
            expect(dggs.z3GetDigit(parentZ3, 5)).toBe(3);
        });

        test('children have valid Z3 values with active digit at child resolution', () => {
            const seqnum = 50n;
            const children = dggs.sequenceNumChildren([seqnum], 5)[0];

            expect(children.length).toBeGreaterThanOrEqual(1);

            for (const child of children) {
                const childZ3 = dggs.sequenceNumToZ3(child, 6);

                // Digit at res 6 should be valid (0-2, not 3)
                const d6 = dggs.z3GetDigit(childZ3, 6);
                expect(d6).toBeGreaterThanOrEqual(0);
                expect(d6).toBeLessThanOrEqual(2);

                // Round-trip check
                const backToSeq = dggs.z3ToSequenceNum(childZ3, 6);
                expect(backToSeq).toBe(child);
            }
        });
    });

    // -----------------------------------------------------------------------
    // ZORDER digit operations
    // -----------------------------------------------------------------------
    describe('ZORDER digits (aperture 4)', () => {
        beforeAll(() => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 4,
            }, 5);
        });

        test('zOrderGetQuad returns valid quad number', () => {
            const zorder = dggs.sequenceNumToZOrder(100n, 5);
            const quad = dggs.zOrderGetQuad(zorder);
            expect(quad).toBeGreaterThanOrEqual(0);
            expect(quad).toBeLessThanOrEqual(11);
        });

        test('zOrderGetDigit returns values 0-3 for active resolutions', () => {
            const zorder = dggs.sequenceNumToZOrder(100n, 5);
            for (let r = 1; r <= 5; r++) {
                const digit = dggs.zOrderGetDigit(zorder, r);
                expect(digit).toBeGreaterThanOrEqual(0);
                expect(digit).toBeLessThanOrEqual(3);
            }
        });

        test('zOrderSetDigit modifies a single digit without affecting others', () => {
            const zorder = dggs.sequenceNumToZOrder(100n, 5);
            const modified = dggs.zOrderSetDigit(zorder, 3, 2);

            expect(dggs.zOrderGetQuad(modified)).toBe(dggs.zOrderGetQuad(zorder));
            expect(dggs.zOrderGetDigit(modified, 3)).toBe(2);
            expect(dggs.zOrderGetDigit(modified, 1)).toBe(dggs.zOrderGetDigit(zorder, 1));
            expect(dggs.zOrderGetDigit(modified, 2)).toBe(dggs.zOrderGetDigit(zorder, 2));
            expect(dggs.zOrderGetDigit(modified, 4)).toBe(dggs.zOrderGetDigit(zorder, 4));
        });

        test('zOrderExtractDigits returns correct quad and digit array', () => {
            const zorder = dggs.sequenceNumToZOrder(100n, 5);
            const { quad, digits } = dggs.zOrderExtractDigits(zorder, 5);

            expect(quad).toBe(dggs.zOrderGetQuad(zorder));
            expect(digits).toHaveLength(5);
            for (let i = 0; i < 5; i++) {
                expect(digits[i]).toBe(dggs.zOrderGetDigit(zorder, i + 1));
            }
        });

        test('spatially close cells share ZORDER digit prefix', () => {
            const seqnum = 100n;
            const zorder = dggs.sequenceNumToZOrder(seqnum, 5);
            const neighbors = dggs.sequenceNumNeighbors([seqnum], 5)[0];

            // At least some neighbors should share the quad
            const centerQuad = dggs.zOrderGetQuad(zorder);
            const sameQuadCount = neighbors.filter(n => {
                const nz = dggs.sequenceNumToZOrder(n, 5);
                return dggs.zOrderGetQuad(nz) === centerQuad;
            }).length;

            expect(sameQuadCount).toBeGreaterThan(0);
        });
    });

    // -----------------------------------------------------------------------
    // Cross-index consistency
    // -----------------------------------------------------------------------
    describe('cross-index consistency', () => {
        test('Z7 digit operations are consistent with SEQNUM round-trip', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 7,
            }, 5);

            // Convert cell to Z7, modify a digit, convert back, and verify it's a valid cell
            const seqnum = 100n;
            const z7 = dggs.sequenceNumToZ7(seqnum, 5);

            // Change digit at res 5 to a different value
            const origDigit = dggs.z7GetDigit(z7, 5);
            const newDigit = (origDigit + 1) % 7;
            const modified = dggs.z7SetDigit(z7, 5, newDigit);

            // Should convert back to a valid but different cell
            const newSeqnum = dggs.z7ToSequenceNum(modified, 5);
            expect(newSeqnum).not.toBe(seqnum);

            // Converting back to Z7 should give our modified value
            const roundTrip = dggs.sequenceNumToZ7(newSeqnum, 5);
            expect(dggs.z7GetDigit(roundTrip, 5)).toBe(newDigit);
        });

        test('Z3 digit operations are consistent with SEQNUM round-trip', () => {
            dggs.setDggs({
                poleCoordinates: { lat: 0, lng: 0 },
                azimuth: 0,
                topology: Topology.HEXAGON,
                projection: 'ISEA' as any,
                aperture: 3,
            }, 5);

            const seqnum = 50n;
            const z3 = dggs.sequenceNumToZ3(seqnum, 5);

            const origDigit = dggs.z3GetDigit(z3, 5);
            const newDigit = (origDigit + 1) % 3;
            const modified = dggs.z3SetDigit(z3, 5, newDigit);

            const newSeqnum = dggs.z3ToSequenceNum(modified, 5);
            expect(newSeqnum).not.toBe(seqnum);

            const roundTrip = dggs.sequenceNumToZ3(newSeqnum, 5);
            expect(dggs.z3GetDigit(roundTrip, 5)).toBe(newDigit);
        });
    });
});
