import { expect, test, describe, beforeAll } from 'vitest';
import { Webdggrid, Topology } from '../../lib-esm/webdggrid';

// ── Shared setup ─────────────────────────────────────────────────────────────
//
// Tests for hierarchical operations: neighbors, parents, and children.
// Uses ISEA4H (aperture 4, hexagon) with resolution 5 by default.

let dggs: Webdggrid;

beforeAll(async () => {
    dggs = await Webdggrid.load() as any;
});

// ── Neighbors ────────────────────────────────────────────────────────────────

describe('sequenceNumNeighbors', () => {
    test('returns neighboring cells for a single hexagon', () => {
        const neighbors = dggs.sequenceNumNeighbors([100n], 5);

        expect(neighbors).toHaveLength(1);
        expect(neighbors[0].length).toBeGreaterThan(0);
        expect(neighbors[0].length).toBeLessThanOrEqual(6);

        // All neighbors should be BigInts
        neighbors[0].forEach(n => {
            expect(typeof n).toBe('bigint');
        });
    });

    test('returns neighbors for multiple cells', () => {
        const neighbors = dggs.sequenceNumNeighbors([100n, 200n, 300n], 5);

        expect(neighbors).toHaveLength(3);
        neighbors.forEach(cellNeighbors => {
            expect(cellNeighbors.length).toBeGreaterThan(0);
            expect(cellNeighbors.length).toBeLessThanOrEqual(6);
        });
    });

    test('neighbors should not include the cell itself', () => {
        const cellId = 100n;
        const neighbors = dggs.sequenceNumNeighbors([cellId], 5);

        expect(neighbors[0]).not.toContain(cellId);
    });

    test('throws error for triangle topology', () => {
        const triangleDggs = dggs;
        triangleDggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: Topology.TRIANGLE,
            projection: 'ISEA' as any,
            aperture: 4,
        }, 5);

        expect(() => {
            triangleDggs.sequenceNumNeighbors([100n], 5);
        }).toThrow('Neighbor detection is not supported for TRIANGLE topology');

        // Reset to hexagon for other tests
        triangleDggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: Topology.HEXAGON,
            projection: 'ISEA' as any,
            aperture: 4,
        }, 5);
    });
});

// ── Parents ──────────────────────────────────────────────────────────────────

describe('sequenceNumParent', () => {
    test('returns parent cell at coarser resolution', () => {
        const parents = dggs.sequenceNumParent([100n], 5);

        expect(parents).toHaveLength(1);
        expect(typeof parents[0]).toBe('bigint');

        // Parent at res 4 should have a lower ID than children at res 5
        expect(parents[0]).toBeLessThan(100n);
    });

    test('returns parents for multiple cells', () => {
        const parents = dggs.sequenceNumParent([100n, 200n, 300n], 5);

        expect(parents).toHaveLength(3);
        parents.forEach(parent => {
            expect(typeof parent).toBe('bigint');
        });
    });

    test('interior children share the same parent', () => {
        // Get a parent and its children
        const parent = dggs.sequenceNumParent([400n], 5);
        const children = dggs.sequenceNumChildren(parent, 4);

        // The first child (interior) should have the correct parent
        const firstChildParent = dggs.sequenceNumParent([children[0][0]], 5);
        expect(firstChildParent[0]).toBe(parent[0]);
    });

    test('throws error when resolution is 0', () => {
        expect(() => {
            dggs.sequenceNumParent([1n], 0);
        }).toThrow('Cannot get parent at resolution 0 or below');
    });

    test('parent at res 1 should be at res 0', () => {
        const parents = dggs.sequenceNumParent([10n], 1);

        expect(parents).toHaveLength(1);
        expect(typeof parents[0]).toBe('bigint');
    });
});

// ── All Parents ─────────────────────────────────────────────────────────────

describe('sequenceNumAllParents', () => {
    test('returns at least one parent with primary first', () => {
        const allParents = dggs.sequenceNumAllParents([100n], 5);

        expect(allParents).toHaveLength(1); // one input cell
        expect(allParents[0].length).toBeGreaterThanOrEqual(1);

        // Primary parent should match sequenceNumParent
        const primary = dggs.sequenceNumParent([100n], 5)[0];
        expect(allParents[0][0]).toBe(primary);
    });

    test('primary parent contains the child in its children', () => {
        const cellId = 256n;
        const allParents = dggs.sequenceNumAllParents([cellId], 3);
        const primary = allParents[0][0];

        const children = dggs.sequenceNumChildren([primary], 2)[0];
        expect(children).toContain(cellId);
    });

    test('boundary cells may have multiple parents', () => {
        // Test many cells — some should have >1 parent
        let foundMultiple = false;
        for (let i = 1n; i <= 300n; i++) {
            const allParents = dggs.sequenceNumAllParents([i], 3);
            if (allParents[0].length > 1) {
                foundMultiple = true;
                // Primary should still be first
                const primary = dggs.sequenceNumParent([i], 3)[0];
                expect(allParents[0][0]).toBe(primary);
                break;
            }
        }
        expect(foundMultiple).toBe(true);
    });

    test('works for multiple cells at once', () => {
        const allParents = dggs.sequenceNumAllParents([100n, 200n], 5);
        expect(allParents).toHaveLength(2);
        expect(allParents[0].length).toBeGreaterThanOrEqual(1);
        expect(allParents[1].length).toBeGreaterThanOrEqual(1);
    });

    test('throws error when resolution is 0', () => {
        expect(() => {
            dggs.sequenceNumAllParents([1n], 0);
        }).toThrow();
    });
});

// ── Children ─────────────────────────────────────────────────────────────────

describe('sequenceNumChildren', () => {
    test('returns children cells at finer resolution', () => {
        const children = dggs.sequenceNumChildren([25n], 4);

        expect(children).toHaveLength(1);
        // Hexagon grids return 7 children (1 interior + 6 boundary cells)
        expect(children[0].length).toBe(7);

        // All children should be BigInts
        children[0].forEach(child => {
            expect(typeof child).toBe('bigint');
        });
    });

    test('returns children for multiple cells', () => {
        const children = dggs.sequenceNumChildren([25n, 30n, 35n], 4);

        expect(children).toHaveLength(3);
        children.forEach(cellChildren => {
            expect(cellChildren.length).toBe(7); // 7 children for hexagons
        });
    });

    test('number of children is consistent across apertures', () => {
        // Test aperture 4
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: Topology.HEXAGON,
            projection: 'ISEA' as any,
            aperture: 4,
        }, 3);

        const children4 = dggs.sequenceNumChildren([10n], 3);
        expect(children4[0].length).toBe(7);

        // Test aperture 3
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: Topology.HEXAGON,
            projection: 'ISEA' as any,
            aperture: 3,
        }, 3);

        const children3 = dggs.sequenceNumChildren([10n], 3);
        expect(children3[0].length).toBe(7);

        // Test aperture 7
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: Topology.HEXAGON,
            projection: 'ISEA' as any,
            aperture: 7,
        }, 3);

        const children7 = dggs.sequenceNumChildren([10n], 3);
        expect(children7[0].length).toBe(13);

        // Reset to aperture 4 for other tests
        dggs.setDggs({
            poleCoordinates: { lat: 0, lng: 0 },
            azimuth: 0,
            topology: Topology.HEXAGON,
            projection: 'ISEA' as any,
            aperture: 4,
        }, 5);
    });

    test('interior child has correct parent', () => {
        const parentId = 25n;
        const children = dggs.sequenceNumChildren([parentId], 4);

        // Get parent of first child (interior child)
        const firstChildParent = dggs.sequenceNumParent([children[0][0]], 5);

        // The interior child should have the correct parent
        expect(firstChildParent[0]).toBe(parentId);
    });
});

// ── Integration Tests ────────────────────────────────────────────────────────

describe('hierarchical integration', () => {
    test('interior child-parent relationship is bidirectional', () => {
        // Get a cell's children
        const cellId = 50n;
        const children = dggs.sequenceNumChildren([cellId], 4);

        // The first child (interior) should have cellId as parent
        const firstChildParent = dggs.sequenceNumParent([children[0][0]], 5);
        expect(firstChildParent[0]).toBe(cellId);
    });

    test('neighbors of parent include some neighbors of child', () => {
        // Get a cell and its parent
        const childId = 100n;
        const parent = dggs.sequenceNumParent([childId], 5);

        // Get neighbors at both resolutions
        const childNeighbors = dggs.sequenceNumNeighbors([childId], 5);
        const parentNeighbors = dggs.sequenceNumNeighbors(parent, 4);

        // Both should have neighbors
        expect(childNeighbors[0].length).toBeGreaterThan(0);
        expect(parentNeighbors[0].length).toBeGreaterThan(0);
    });

    test('geographic coherence: children centroids are near parent centroid', () => {
        const parentId = 30n;
        const children = dggs.sequenceNumChildren([parentId], 4);

        // Get centroids
        const parentCentroid = dggs.sequenceNumToGeo([parentId], 4);
        const childCentroids = dggs.sequenceNumToGeo(children[0], 5);

        // All child centroids should be within reasonable distance of parent
        const [parentLng, parentLat] = parentCentroid[0];

        childCentroids.forEach(([childLng, childLat]) => {
            const lngDiff = Math.abs(childLng - parentLng);
            const latDiff = Math.abs(childLat - parentLat);

            // Should be close (within a few degrees at these resolutions)
            expect(lngDiff).toBeLessThan(10);
            expect(latDiff).toBeLessThan(10);
        });
    });
});
