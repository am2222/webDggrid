import { describe, test, beforeAll, expect } from 'vitest';
import { Webdggrid, Topology, Projection } from '../../lib-esm/webdggrid';

// DGGRID is compiled with double instead of long double (DGGRID_DOUBLE_PRECISION
// in CMakeLists.txt). Results match the long double build to rounding noise,
// except where a point sits exactly on a cell or parent boundary: there the
// tie can resolve to the other, equally valid, cell. These tests check that
// such answers are always valid rather than pinning which one is chosen.

const POLE = { lat: 58.28252559, lng: 11.25 }; // also an icosahedron vertex

// ISEA, pole above, resolution 5 (aperture 4) / 6 (aperture 3)
const FLIPPED: Record<number, bigint[]> = {
    4: [9487n, 4683n, 8942n, 3737n],
    3: [444n, 5456n, 1436n],
};

const grid = (aperture: number, topology = Topology.HEXAGON) => ({
    poleCoordinates: POLE,
    azimuth: 0,
    topology,
    projection: Projection.ISEA,
    aperture,
});

describe('precision ties resolve to valid answers', () => {
    let dggs: Webdggrid;

    beforeAll(async () => {
        dggs = await Webdggrid.load();
    });

    for (const topology of [Topology.TRIANGLE, Topology.DIAMOND]) {
        test(`${topology}: a point on an icosahedron vertex lands in a cell with that corner`, () => {
            for (const res of [2, 6]) {
                dggs.setDggs(grid(4, topology), res);
                const [cell] = dggs.geoToSequenceNum([[POLE.lng, POLE.lat]], res);
                const [ring] = dggs.sequenceNumToGrid([cell], res, false);
                const nearest = Math.min(...ring.map(([lng, lat]) => Math.hypot(lng - POLE.lng, lat - POLE.lat)));
                expect(nearest).toBeLessThan(1e-6);
            }
        });
    }

    for (const [aperture, res] of [[4, 5], [3, 6], [7, 4]]) {
        test(`aperture ${aperture}: the primary parent is always one of the touching parents`, () => {
            dggs.setDggs(grid(aperture), res);
            // most of these have 2-3 touching parents; FLIPPED are cells whose
            // primary parent differed between the long double and double builds
            const cells = [
                ...Array.from({ length: 300 }, (_, i) => BigInt(1 + i * 7)),
                ...(FLIPPED[aperture] ?? []),
            ];
            const parents = dggs.sequenceNumParent(cells, res);
            const allParents = dggs.sequenceNumAllParents(cells, res);
            cells.forEach((_, i) => {
                expect(allParents[i]).toContain(parents[i]);
            });
        });
    }
});
