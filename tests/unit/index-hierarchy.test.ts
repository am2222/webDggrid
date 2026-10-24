import { describe, test, beforeAll, expect } from 'vitest';
import { Webdggrid, Topology, Projection, IndexingSystem } from '../../lib-esm/webdggrid';

const POLE = { lat: 58.28252559, lng: 11.25 };

const PTS = [[0, 0], [10, 45], [-122.7, 42.2], [179.99, -10], [-179.99, 10], [0, 89.9]];

const grid = (aperture: number, projection = Projection.ISEA, topology = Topology.HEXAGON) => ({
    poleCoordinates: POLE,
    azimuth: 0,
    topology,
    projection,
    aperture,
});

describe('Hierarchical index values (pinned to DGGRID v8.44 output)', () => {
    // Golden values captured from the v8.44 build before the DGGRID v9
    // upgrade. Any drift here means the index encoding changed upstream.
    // Values are unsigned 64-bit, as the API returns them.
    //
    // Exception: at ISEA3H res 11, (0, 0) lies on the equator exactly between
    // two cells mirrored across it (cells 412209 and 412452, equidistant).
    // DGGRID 9.1's exact constants resolve that tie to the southern cell, so
    // its seqnum and indexes are re-pinned from the 9.1 build.
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    const cases: Array<{
        name: string; aperture: number; projection?: Projection; res: number;
        method: 'sequenceNumToZOrder' | 'sequenceNumToZ3' | 'sequenceNumToZ7';
        seq: string[]; values: string[];
    }> = [
        {
            name: 'ISEA4H ZORDER', aperture: 4, res: 9, method: 'sequenceNumToZOrder',
            seq: ['609961', '552383', '153274', '2465923', '2425555', '259'],
            values: ['3688725171746635776', '3836473146240663552', '1816964955132395520',
                '11783672823061413888', '11764541320738111488', '1441156278805069824'],
        },
        {
            name: 'ISEA3H Z3', aperture: 3, res: 11, method: 'sequenceNumToZ3',
            seq: ['412452', '373218', '103607', '1666557', '1638893', '124'],
            values: ['3482780596550238207', '4153799348842397695', '1324147625766682623',
                '11643663486281580543', '12279452786508169215', '1921534283369938943'],
        },
        {
            name: 'ISEA3H ZORDER', aperture: 3, res: 11, method: 'sequenceNumToZOrder',
            seq: ['412452', '373218', '103607', '1666557', '1638893', '124'],
            values: ['3506797229035749376', '3610362428279226368', '1549418591722405888',
                '11828740705172324352', '11638009522613649408', '1229783964458156032'],
        },
        {
            name: 'ISEA7H Z7', aperture: 7, res: 8, method: 'sequenceNumToZ7',
            seq: ['13412772', '12141547', '3367065', '54229592', '53334392', '3608'],
            values: ['4428445877308227583', '886322439183663103', '2480689684724842495',
                '12145718293868576767', '12401993288704327679', '750311613877190655'],
        },
        {
            name: 'FULLER7H Z7', aperture: 7, projection: Projection.FULLER, res: 6, method: 'sequenceNumToZ7',
            seq: ['273484', '248973', '69069', '1107637', '1089170', '174'],
            values: ['4428454604681773055', '894896911893397503', '2480687348262633471',
                '12145869545436872703', '12394794579918847999', '750315530887364607'],
        },
    ];

    for (const c of cases) {
        test(c.name, () => {
            dggs.setDggs(grid(c.aperture, c.projection), c.res);
            const seq = dggs.geoToSequenceNum(PTS, c.res);
            expect(seq.map(String)).toEqual(c.seq);
            expect(seq.map((s) => String(dggs[c.method](s, c.res)))).toEqual(c.values);
        });
    }
});

describe('Indexing parent/children (DGGRID v9)', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    const systems: Array<{
        name: string; aperture: number; system?: IndexingSystem;
        toIndex: 'sequenceNumToZ7' | 'sequenceNumToZ3' | 'sequenceNumToZOrder';
        extract: 'z7ExtractDigits' | 'z3ExtractDigits' | 'zOrderExtractDigits';
    }> = [
        { name: 'Z7 (default for aperture 7)', aperture: 7, toIndex: 'sequenceNumToZ7', extract: 'z7ExtractDigits' },
        { name: 'Z3 (default for aperture 3)', aperture: 3, toIndex: 'sequenceNumToZ3', extract: 'z3ExtractDigits' },
        { name: 'ZORDER on aperture 3', aperture: 3, system: IndexingSystem.ZORDER, toIndex: 'sequenceNumToZOrder', extract: 'zOrderExtractDigits' },
        { name: 'ZORDER (default for aperture 4)', aperture: 4, toIndex: 'sequenceNumToZOrder', extract: 'zOrderExtractDigits' },
    ];

    for (const s of systems) {
        test(`${s.name}: parent index drops the last digit`, () => {
            const res = 5;
            dggs.setDggs(grid(s.aperture), res);
            const cells = dggs.geoToSequenceNum(PTS, res);
            const parents = dggs.sequenceNumIndexParent(cells, res, s.system);

            expect(parents).toHaveLength(cells.length);
            cells.forEach((cell, i) => {
                const c = dggs[s.extract](dggs[s.toIndex](cell, res), res);
                const p = dggs[s.extract](dggs[s.toIndex](parents[i], res - 1), res - 1);
                expect(p.quad).toBe(c.quad);
                expect(p.digits).toEqual(c.digits.slice(0, res - 1));
            });
        });
    }

    // DGGRID 9.1 fixed Z3 and ZORDER indexing children (9.03b applied the
    // Z7 digit rules to them), so every system is checked.
    for (const s of systems) {
        describe(`${s.name} children`, () => {
            const res = 4;

            test('children extend the parent index by one digit', () => {
                dggs.setDggs(grid(s.aperture), res);
                const cells = dggs.geoToSequenceNum(PTS, res);
                const children = dggs.sequenceNumIndexChildren(cells, res, s.system);

                expect(children).toHaveLength(cells.length);
                cells.forEach((cell, i) => {
                    const kids = children[i];
                    expect(kids.length).toBeGreaterThan(0);
                    expect(new Set(kids).size).toBe(kids.length);

                    const p = dggs[s.extract](dggs[s.toIndex](cell, res), res);
                    const digits = kids.map((kid) => {
                        const c = dggs[s.extract](dggs[s.toIndex](kid, res + 1), res + 1);
                        expect(c.quad).toBe(p.quad);
                        expect(c.digits.slice(0, res)).toEqual(p.digits);
                        return c.digits[res];
                    });
                    expect(new Set(digits).size).toBe(kids.length);
                });
            });

            test('parent of each child is the original cell', () => {
                dggs.setDggs(grid(s.aperture), res);
                const cells = dggs.geoToSequenceNum(PTS, res);
                const children = dggs.sequenceNumIndexChildren(cells, res, s.system);

                cells.forEach((cell, i) => {
                    const parents = dggs.sequenceNumIndexParent(children[i], res + 1, s.system);
                    expect(parents).toEqual(children[i].map(() => cell));
                });
            });
        });
    }

    describe('Z7 children', () => {

        test('7 per hexagon, 6 per pentagon', () => {
            dggs.setDggs(grid(7), 3);
            // The grid's pole sits on an icosahedron vertex, so the cell
            // there is a pentagon at every resolution.
            const pentagon = dggs.geoToSequenceNum([[POLE.lng, POLE.lat]], 3);
            const hexagon = dggs.geoToSequenceNum([[10, 45]], 3);
            expect(dggs.sequenceNumIndexChildren(pentagon, 3)[0]).toHaveLength(6);
            expect(dggs.sequenceNumIndexChildren(hexagon, 3)[0]).toHaveLength(7);
        });
    });

    describe('errors', () => {
        test('resolution 0 has no indexing parent', () => {
            dggs.setDggs(grid(7), 0);
            expect(() => dggs.sequenceNumIndexParent([1n], 0)).toThrow(/resolution 0/);
        });

        test('system not matching the aperture', () => {
            dggs.setDggs(grid(4), 3);
            expect(() => dggs.sequenceNumIndexChildren([1n], 3, IndexingSystem.Z7)).toThrow(/Z7 not available/);
        });

        test('non-hexagon topology', () => {
            dggs.setDggs(grid(4, Projection.ISEA, Topology.TRIANGLE), 3);
            expect(() => dggs.sequenceNumIndexParent([1n], 3)).toThrow(/not available/);
        });

        test('aperture sequences', () => {
            dggs.setDggs({ ...grid(4), apertureSequence: '434747' }, 3);
            expect(() => dggs.sequenceNumIndexParent([1n], 3)).toThrow(/not available/);
        });

        test('C++ error messages reach JS (needs -fexceptions on Emscripten 6)', () => {
            dggs.setDggs(grid(4), 3);
            expect(() => dggs.sequenceNumParent([1n], 31)).toThrow(/res must be 0/);
            // a method with no catch of its own: the module wrapper supplies the message
            expect(() => dggs.geoToSequenceNum([[0, 0]], 31)).toThrow(/res must be 0/);
        });

        test('module stays usable after an unsupported request', () => {
            dggs.setDggs(grid(7), 3);
            expect(() => dggs.sequenceNumIndexChildren([1n], 3, IndexingSystem.Z3)).toThrow();
            expect(dggs.sequenceNumIndexChildren([1n], 3)[0].length).toBeGreaterThan(0);
        });
    });
});
