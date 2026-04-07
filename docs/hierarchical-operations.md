# Hierarchical Operations

WebDggrid now supports hierarchical relationships between DGGS cells, enabling powerful spatial analysis patterns including:

- **Neighbor detection** — find cells that share an edge
- **Parent-child relationships** — navigate between resolution levels
- **Spatial indexing** — build hierarchical spatial indexes

These operations leverage DGGRID's built-in topological algorithms for efficient, accurate adjacency and hierarchical queries.

## Interactive Demo

Click any cell to select it and explore its hierarchical relationships. Navigate to parents, children, or neighbors by clicking cells in the visualization or using the buttons in the panel.

<ClientOnly>
  <DggsD3HierarchyDemo />
</ClientOnly>

## Cell Neighbors


Find all cells that share an edge with a given cell using `sequenceNumNeighbors()`.

### Basic Usage

```typescript
import { Webdggrid } from 'webdggrid';

const dggs = await Webdggrid.load();

// Configure grid (ISEA4H)
dggs.setDggs({
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  aperture: 4,
  topology: 'HEXAGON',
  projection: 'ISEA',
}, 5);

// Get neighbors of a single cell
const cellId = 12345n;
const neighbors = dggs.sequenceNumNeighbors([cellId], 5);

console.log(`Cell ${cellId} has ${neighbors[0].length} neighbors:`);
neighbors[0].forEach(n => console.log(`  - ${n}`));
```

### Batch Processing

The method efficiently handles multiple cells at once:

```typescript
// Get neighbors for multiple cells
const cellIds = [100n, 200n, 300n];
const allNeighbors = dggs.sequenceNumNeighbors(cellIds, 5);

allNeighbors.forEach((neighbors, idx) => {
  console.log(`Cell ${cellIds[idx]}: ${neighbors.length} neighbors`);
});
```

### Topology Notes

- **Hexagon grids**: Interior cells typically have 6 neighbors; pentagon cells have 5
- **Diamond grids**: Cells typically have 4 neighbors
- **Triangle grids**: ⚠️ **Not supported** — will throw an error

```typescript
// Triangle topology will throw an error
dggs.setDggs({ topology: 'TRIANGLE', ... }, 5);
dggs.sequenceNumNeighbors([cellId], 5); // ❌ Error!
```

## Parent Cells

Navigate to coarser resolutions by finding the parent cell at `resolution - 1`.

### Basic Usage

```typescript
// Find parent of a cell at resolution 5
const child = 12345n;
const parent = dggs.sequenceNumParent([child], 5);

console.log(`Parent of ${child} (res 5): ${parent[0]} (res 4)`);
```

### Hierarchical Aggregation

Parents are perfect for spatial aggregation patterns:

```typescript
// Group cells by their common parent
const cells = [100n, 101n, 102n, 103n]; // All at resolution 5
const parents = dggs.sequenceNumParent(cells, 5);

// Group by parent
const groups = new Map();
cells.forEach((cell, i) => {
  const parent = parents[i];
  if (!groups.has(parent)) groups.set(parent, []);
  groups.get(parent).push(cell);
});

// Each group contains sibling cells
for (const [parent, siblings] of groups) {
  console.log(`Parent ${parent} contains ${siblings.length} cells`);
}
```

### Climbing the Resolution Ladder

```typescript
// Navigate up multiple levels
let current = 50000n;
let resolution = 8;

while (resolution > 0) {
  const [parent] = dggs.sequenceNumParent([current], resolution);
  console.log(`Res ${resolution}: ${current} → Res ${resolution 1}: ${parent}`);
  current = parent;
  resolution--;
}
```

## Child Cells

Subdivide cells into finer resolutions using `sequenceNumChildren()`.

### Basic Usage

```typescript
// Get all children of a cell
const parentId = 100n;
const children = dggs.sequenceNumChildren([parentId], 4); // Returns res 5 cells

console.log(`Cell ${parentId} has ${children[0].length} children`);
// aperture 4 → 4 children
// aperture 3 → 3 children
// aperture 7 → 7 children
```

### Progressive Refinement

```typescript
// Start at low resolution and progressively refine
const startCell = 10n;
let currentLevel = [startCell];
let resolution = 2;

while (resolution < 6) {
  console.log(`Resolution ${resolution}: ${currentLevel.length} cells`);
  
  // Get children for all cells at current level
  const nextLevel = [];
  const allChildren = dggs.sequenceNumChildren(currentLevel, resolution);
  
  for (const childSet of allChildren) {
    nextLevel.push(...childSet);
  }
  
  currentLevel = nextLevel;
  resolution++;
}
```

### Aperture-Dependent Subdivision

Different apertures produce different subdivision counts:

```typescript
// aperture 4 (most common)
dggs.setDggs({ aperture: 4, ... }, 3);
const children4 = dggs.sequenceNumChildren([10n], 3);
console.log(children4[0].length); // 4

// aperture 3
dggs.setDggs({ aperture: 3, ... }, 3);
const children3 = dggs.sequenceNumChildren([10n], 3);
console.log(children3[0].length); // 3

// aperture 7
dggs.setDggs({ aperture: 7, ... }, 3);
const children7 = dggs.sequenceNumChildren([10n], 3);
console.log(children7[0].length); // 7
```

## Combined Patterns

### Neighbor Expansion

Expand a region by including neighbors:

```typescript
function expandRegion(cells: bigint[], resolution: number): bigint[] {
  const expanded = new Set(cells);
  
  // Get neighbors for all cells
  const allNeighbors = dggs.sequenceNumNeighbors(cells, resolution);
  
  // Add all neighbors
  for (const neighbors of allNeighbors) {
    neighbors.forEach(n => expanded.add(n));
  }
  
  return Array.from(expanded);
}

// Expand a region by 1 cell
const region = [100n, 101n, 102n];
const expanded = expandRegion(region, 5);
console.log(`Region grew from ${region.length} to ${expanded.length} cells`);
```

### Multi-Resolution Buffers

Create buffers at multiple resolutions:

```typescript
function createBuffer(cell: bigint, resolution: number, rings: number): bigint[][] {
  const buffer = [[cell]];
  
  for (let ring = 0; ring < rings; ring++) {
    const current = buffer[ring];
    const expanded = expandRegion(current, resolution);
    buffer.push(expanded);
  }
  
  return buffer;
}

// 3-ring buffer around a cell
const cell = 1000n;
const buffer = createBuffer(cell, 5, 3);
buffer.forEach((ring, i) => {
  console.log(`Ring ${i}: ${ring.length} cells`);
});
```

### Hierarchical Spatial Join

Join points to cells and aggregate at parent level:

```typescript
// 1. Convert points to high-resolution cells
const points = [
  [-74.006, 40.7128], //  NYC
  [-73.935, 40.7300], // Queens
];
const cells = dggs.geoToSequenceNum(points, 8); // High res

// 2. Get parents for aggregation
const parents = dggs.sequenceNumParent(cells, 8); // Res 7

// 3. Count points per parent cell
const counts = new Map();
parents.forEach(p => {
  counts.set(p, (counts.get(p) || 0) + 1);
});

console.log('Points per parent cell:');
for (const [parent, count] of counts) {
  console.log(`  Cell ${parent}: ${count} points`);
}
```

## Visualization with GeoJSON

Combine hierarchical operations with GeoJSON output:

```typescript
// Get a cell and its neighbors
const cell = 500n;
const neighbors = dggs.sequenceNumNeighbors([cell], 5)[0];

// Create GeoJSON for visualization
const cellGeom = dggs.sequenceNumToGridFeatureCollection([cell], 5);
const neighborGeom = dggs.sequenceNumToGridFeatureCollection(neighbors, 5);

// Style differently
cellGeom.features[0].properties = { type: 'center', color: '#ff0000' };
neighborGeom.features.forEach(f => {
  f.properties = { type: 'neighbor', color: '#0000ff' };
});

// Combine for display
const visualization = {
  type: 'FeatureCollection',
  features: [...cellGeom.features, ...neighborGeom.features],
};
```

## Performance Considerations

### Batch Operations

Always prefer batch operations over loops:

```typescript
// ❌ Slow: Loop calling single-cell functions
const neighbors = [];
for (const cell of cells) {
  neighbors.push(...dggs.sequenceNumNeighbors([cell], 5)[0]);
}

// ✅ Fast: Single batch call
const allNeighbors = dggs.sequenceNumNeighbors(cells, 5);
const neighbors = allNeighbors.flat();
```

### Resolution Levels

- Lower resolutions (0-5): Very fast, few cells
- Medium resolutions (6-10): Fast, moderate cell counts
- High resolutions (11+): Slower, millions of cells

### Memory Usage

```typescript
// Be cautious with high-resolution children
const res5Cell = 100n;

// aperture 4 grows by 4× per level
const res6 = dggs.sequenceNumChildren([res5Cell], 5);   // 4 cells
const res7 = dggs.sequenceNumChildren(res6[0], 6);      // 16 cells total
const res8 = dggs.sequenceNumChildren(res7.flat(), 7);  // 64 cells total
```

## Mixed Aperture Sequences

⚠️ Mixed aperture sequences have limited support:

```typescript
dggs.setDggs({ 
  apertureSequence: "434747",
  topology: 'HEXAGON',
  projection: 'ISEA',
}, 3);

// Parent/child operations MAY work
// Neighbor operations MAY have issues
// Test thoroughly in your specific use case
```

## Error Handling

```typescript
try {
  const neighbors = dggs.sequenceNumNeighbors([cellId], 5);
} catch (error) {
  if (error.message.includes('Triangle')) {
    console.error('Neighbors not supported for triangle topology');
  } else {
    console.error('Invalid cell ID or resolution');
  }
}

try {
  const parent = dggs.sequenceNumParent([cellId], 0);
} catch (error) {
  console.error('Cannot get parent at resolution 0');
}
```

## Primary vs All Parents

`sequenceNumParent()` returns the **primary (containing) parent** — the coarser-resolution cell whose center is closest to the child cell's center. This is determined by converting the child's center point to the parent resolution.

For cells that lie on the **boundary** between two or more parent cells, `sequenceNumAllParents()` returns all touching parents. The primary parent is always first in the returned array.

```ts
// Primary parent only (most common use case)
const parent = dggs.sequenceNumParent([cellId], 5)[0];

// All touching parents (boundary analysis)
const allParents = dggs.sequenceNumAllParents([cellId], 5)[0];
// allParents[0] is the primary (containing) parent
// allParents[1..n] are additional touching parents (if any)
```

Interior cells typically have 1 parent. Boundary cells may have 2–3 parents depending on the aperture and topology.

## API Reference

| Method | Description |
|--------|-------------|
| [`sequenceNumNeighbors()`](api/classes/Webdggrid.md#sequencenumneighbors) | Find all cells sharing an edge with the input cells |
| [`sequenceNumParent()`](api/classes/Webdggrid.md#sequencenumparent) | Get the primary (containing) parent at `resolution - 1` |
| [`sequenceNumAllParents()`](api/classes/Webdggrid.md#sequencenumallparents) | Get all touching parent cells at `resolution - 1` (primary first) |
| [`sequenceNumChildren()`](api/classes/Webdggrid.md#sequencenumchildren) | Get child cells at `resolution + 1` |
