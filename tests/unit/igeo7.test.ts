import { describe, test, beforeAll, expect } from 'vitest';
import { Webdggrid } from '../../lib-esm/webdggrid';

const INVALID = 0xFFFFFFFFFFFFFFFFn; // UINT64_MAX — Z7 invalid sentinel

describe('IGEO7 / Z7 bindings', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    describe('round-trips', () => {
        test('string ↔ packed index', () => {
            const idx = dggs.igeo7FromString('0800432');
            expect(typeof idx).toBe('bigint');
            expect(dggs.igeo7ToString(idx)).toBe('0800432');
        });

        test('encode reproduces from-string', () => {
            // Reference cell: base=8, digits=[0,0,4,3,2], res=5
            const digits = [
                0, 0, 4, 3, 2,
                7, 7, 7, 7, 7,
                7, 7, 7, 7, 7,
                7, 7, 7, 7, 7,
            ];
            const fromEncode = dggs.igeo7Encode(8, digits);
            const fromString = dggs.igeo7FromString('0800432');
            expect(fromEncode).toBe(fromString);
        });

        test('encode rejects wrong digit count', () => {
            expect(() => dggs.igeo7Encode(0, [0, 1, 2])).toThrow(/20 digits/);
        });

        test('known fixed-point — base 0 at resolution 13', () => {
            // Cell id from README: 32023330408103935 → '000161612062413'
            const cell = 32023330408103935n;
            expect(dggs.igeo7GetBaseCell(cell)).toBe(0);
            expect(dggs.igeo7GetResolution(cell)).toBe(13);
            expect(dggs.igeo7ToString(cell)).toBe('000161612062413');

            const encoded = dggs.igeo7Encode(0, [
                0, 1, 6, 1, 6, 1, 2, 0, 6, 2, 4, 1, 3,
                7, 7, 7, 7, 7, 7, 7,
            ]);
            expect(encoded).toBe(cell);
        });
    });

    describe('decomposition', () => {
        test('base cell extraction', () => {
            expect(dggs.igeo7GetBaseCell(dggs.igeo7FromString('0800432'))).toBe(8);
            expect(dggs.igeo7GetBaseCell(dggs.igeo7FromString('11'))).toBe(11);
        });

        test('resolution matches digit count', () => {
            expect(dggs.igeo7GetResolution(dggs.igeo7FromString('08'))).toBe(0);
            expect(dggs.igeo7GetResolution(dggs.igeo7FromString('0800'))).toBe(2);
            expect(dggs.igeo7GetResolution(dggs.igeo7FromString('0800432'))).toBe(5);
        });

        test('digit extraction (1-indexed)', () => {
            const cell = dggs.igeo7FromString('0800432');
            expect(dggs.igeo7GetDigit(cell, 1)).toBe(0);
            expect(dggs.igeo7GetDigit(cell, 2)).toBe(0);
            expect(dggs.igeo7GetDigit(cell, 3)).toBe(4);
            expect(dggs.igeo7GetDigit(cell, 4)).toBe(3);
            expect(dggs.igeo7GetDigit(cell, 5)).toBe(2);
            // Padding beyond resolution
            expect(dggs.igeo7GetDigit(cell, 6)).toBe(7);
            // Out-of-range positions return 7
            expect(dggs.igeo7GetDigit(cell, 0)).toBe(7);
            expect(dggs.igeo7GetDigit(cell, 21)).toBe(7);
        });

        test('first non-zero digit position', () => {
            // '0800432' → digits 0,0,4,3,2 → first non-zero is at position 3
            const cell = dggs.igeo7FromString('0800432');
            expect(dggs.igeo7FirstNonZero(cell)).toBe(3);
            // base-only cell (all digits padded) → 0
            expect(dggs.igeo7FirstNonZero(dggs.igeo7FromString('08'))).toBe(0);
        });
    });

    describe('hierarchy', () => {
        test('parent drops one digit', () => {
            const cell = dggs.igeo7FromString('0800432');
            const parent = dggs.igeo7Parent(cell);
            expect(dggs.igeo7ToString(parent)).toBe('080043');
            expect(dggs.igeo7GetResolution(parent)).toBe(4);
        });

        test('parentAt truncates to target resolution', () => {
            const cell = dggs.igeo7FromString('0800432');
            expect(dggs.igeo7ToString(dggs.igeo7ParentAt(cell, 3))).toBe('08004');
            expect(dggs.igeo7ToString(dggs.igeo7ParentAt(cell, 5))).toBe('0800432');
            // Clamps low and high
            expect(dggs.igeo7GetResolution(dggs.igeo7ParentAt(cell, -1))).toBe(0);
            expect(dggs.igeo7GetResolution(dggs.igeo7ParentAt(cell, 99))).toBeLessThanOrEqual(20);
        });

        test('parent at res 0 equals root', () => {
            const cell = dggs.igeo7FromString('0800432');
            const root = dggs.igeo7ParentAt(cell, 0);
            expect(dggs.igeo7GetResolution(root)).toBe(0);
            expect(dggs.igeo7GetBaseCell(root)).toBe(8);
        });

        test('recursive walk up to resolution 0', () => {
            let cell = dggs.igeo7FromString('0800432');
            const path: string[] = [dggs.igeo7ToString(cell)];
            while (dggs.igeo7GetResolution(cell) > 0) {
                cell = dggs.igeo7Parent(cell);
                path.push(dggs.igeo7ToString(cell));
            }
            expect(path).toEqual([
                '0800432',
                '080043',
                '08004',
                '0800',
                '080',
                '08',
            ]);
        });
    });

    describe('neighbours', () => {
        test('returns exactly 6 entries', () => {
            const cell = dggs.igeo7FromString('0800432');
            const ns = dggs.igeo7Neighbours(cell);
            expect(ns).toHaveLength(6);
            ns.forEach(n => expect(typeof n).toBe('bigint'));
        });

        test('single-neighbour lookup matches array lookup', () => {
            const cell = dggs.igeo7FromString('0800432');
            const all = dggs.igeo7Neighbours(cell);
            for (let dir = 1; dir <= 6; dir++) {
                expect(dggs.igeo7Neighbour(cell, dir)).toBe(all[dir - 1]);
            }
        });

        test('invalid direction yields invalid sentinel', () => {
            const cell = dggs.igeo7FromString('0800432');
            expect(dggs.igeo7Neighbour(cell, 0)).toBe(INVALID);
            expect(dggs.igeo7Neighbour(cell, 7)).toBe(INVALID);
            expect(dggs.igeo7Neighbour(cell, -1)).toBe(INVALID);
        });

        test('pentagon (base cell 0 at res 2) has exactly one invalid neighbour', () => {
            // At '0800' the digits are all zero → pentagon case: direction 5
            // is excluded per exclusion_zone[0] = 2? Actually exclusion_zone[0]
            // is 2, so direction 2 is excluded. Regardless of which: exactly
            // one of the six is invalid.
            const pent = dggs.igeo7FromString('0800');
            const ns = dggs.igeo7Neighbours(pent);
            const invalidCount = ns.filter(n => !dggs.igeo7IsValid(n)).length;
            expect(invalidCount).toBe(1);
        });

        test('non-pentagon cell has all 6 neighbours valid', () => {
            const cell = dggs.igeo7FromString('0800432');
            const ns = dggs.igeo7Neighbours(cell);
            ns.forEach(n => expect(dggs.igeo7IsValid(n)).toBe(true));
        });
    });

    describe('validity sentinel', () => {
        test('isValid true for normal cells, false for sentinel', () => {
            expect(dggs.igeo7IsValid(dggs.igeo7FromString('0800432'))).toBe(true);
            expect(dggs.igeo7IsValid(INVALID)).toBe(false);
        });
    });
});
