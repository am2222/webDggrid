# Examples

This page showcases working examples that demonstrate WebDggrid's capabilities.

## Multi-Aperture Grid Example

File: [`examples/multi-aperture-example.mjs`](../examples/multi-aperture-example.mjs)

Demonstrates how to create grids with multi-aperture sequences (mixed apertures across resolutions).

**Features:**
- Configure multi-aperture sequences like `[3, 4, 3, 4]`
- Convert geographic coordinates to cell IDs
- Generate GeoJSON grid geometries
- Query grid statistics (cell counts, areas, spacings)

**Run:**
```bash
npm run build
node examples/multi-aperture-example.mjs
```

**Output includes:**
- Grid configuration details
- Coordinate conversion results
- Generated GeoJSON
- Grid statistics for each resolution level

See [Multi-Aperture Grids](multi-aperture.md) for complete documentation.

---

## Coordinate Transformation Example

File: [`examples/coordinate-transforms-example.mjs`](../examples/coordinate-transforms-example.mjs)

Demonstrates all available coordinate systems and transformations.

**Features:**
- Convert between all 6 coordinate systems (GEO, SEQNUM, Q2DI, Q2DD, PROJTRI, PLANE)
- Round-trip validation
- Q2DI → GeoJSON workflow
- Multi-system conversion chains

**Coordinate Systems:**
- **GEO** - Geographic (longitude, latitude) in degrees
- **SEQNUM** - Sequence number (unique cell ID)
- **Q2DI** - Quad 2D Integer (quad, i, j)
- **Q2DD** - Quad 2D Double (quad, x, y)
- **PROJTRI** - Projection Triangle (tnum, x, y)
- **PLANE** - Planar (x, y) - output only

**Run:**
```bash
npm run build
node examples/coordinate-transforms-example.mjs
```

**Output includes:**
- Transformations from GEO to all coordinate systems
- Round-trip validation (GEO → Q2DI → GEO)
- Q2DI to GeoJSON workflow demonstration
- Multi-system conversion chain

See [Coordinate Transformations](coordinate-transformations.md) for complete documentation.

---

## Getting Started Example

See the [Getting Started](getting-started.md) guide for a basic introduction:

```typescript
import { Webdggrid } from 'webdggrid';

// Load the DGGRID module
const dggs = await Webdggrid.load();

// Configure DGGS
dggs.setDggs({
    poleCoordinates: { lat: 0, lng: 0 },
    azimuth: 0,
    aperture: 4,
    topology: 'HEXAGON',
    projection: 'ISEA'
}, 5);

// Convert coordinates to cell IDs
const cellIds = dggs.geoToSequenceNum([[0, 0], [10, 20]], 5);
console.log('Cell IDs:', cellIds); // [1n, 4381n]

// Generate GeoJSON polygons
const geojson = dggs.sequenceNumToGridFeatureCollection(cellIds, 5);
console.log('Features:', geojson.features.length); // 2
```

---

## Additional Resources

- [API Documentation](api/classes/Webdggrid.md)
- [Testing Guide](testing.md)
- [Multi-Aperture Documentation](multi-aperture.md)
- [Coordinate Transformations](coordinate-transformations.md)

