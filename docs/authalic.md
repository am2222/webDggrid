# Authalic latitude conversion

WGS84 is an oblate ellipsoid. Most DGGS theory and equal-area projections
prefer to work on a sphere with the **same surface area** as the ellipsoid —
the *authalic* sphere. Mapping a geodetic latitude `φ` to its authalic
counterpart `ξ` is a small (≤0.19°) shift that's zero at the equator and
poles and peaks near ±45°.

WebDggrid exposes the conversion as both a scalar primitive and a
GeoJSON-walking helper. They mirror the
[`igeo7_geo_to_authalic` / `igeo7_authalic_to_geo`](https://github.com/allixender/igeo7_duckdb#authalic-latitude-conversion)
DuckDB extension functions; the JS versions cover the cases the DuckDB
`(GEOMETRY) → GEOMETRY` signature can't reach (DuckDB `GEOMETRY` doesn't
exist in the WASM environment).

```ts
import { Webdggrid } from 'webdggrid'
const dggs = await Webdggrid.load()

dggs.igeo7GeoToAuthalic(45)                 // ~44.8717
dggs.igeo7AuthalicToGeo(44.87170287)        // ~45.0
dggs.igeo7TransformGeoJson(featureCollection) // deep-clones, applies to every coord
```

The math follows Karney (2022)'s polynomial expansion — the same
implementation the DuckDB extension uses on `GEOMETRY` columns.

## When to use it

The authalic conversion does **not** belong in your display pipeline.
Mapping libraries (Cesium, MapLibre, Leaflet, deck.gl) all interpret
incoming coordinates as WGS84 geodetic; if you feed them authalic
latitudes the cells will drift relative to the basemap. Reach for it in
the three places below instead.

### 1. Computing equal-area cell area on the sphere

DGGRID's `cellAreaKM` returns the cell area on the *authalic* sphere of
radius `R = 6371.0072 km`. If you compute area yourself from the cell's
lat/lng vertices using a formula that assumes a uniform sphere — e.g.
spherical excess (Girard's theorem) on the raw geodetic vertices — you'll
get a slightly different number, because those vertices live on the
ellipsoid, not the authalic sphere. Apply `igeo7GeoToAuthalic` to the
latitudes first and the equality returns:

```ts
import { Webdggrid } from 'webdggrid'
const dggs = await Webdggrid.load()

const seq = dggs.geoToSequenceNum([[0, 45]], 5)[0]
const ring = dggs.sequenceNumToGrid([seq], 5, /*unwrap=*/false)[0]

// Authalic-shifted ring (lat only):
const ringA = ring.map(([lng, lat]) => [lng, dggs.igeo7GeoToAuthalic(lat)])

// Apply spherical excess on each:
const RA = 6371007.181 // authalic-sphere radius (m), WGS84
const areaGeo  = sphericalExcess(ring)  * RA * RA / 1e6  // km²
const areaAuth = sphericalExcess(ringA) * RA * RA / 1e6

console.log(areaGeo, areaAuth, dggs.cellAreaKM(5))
// areaAuth ≈ dggs.cellAreaKM(5) — the equal-area property holds on
// the authalic sphere; areaGeo is biased.
```

Same story for any planar hit-testing or distance math you do directly on
cell vertices: convert the latitudes first, then assume a uniform sphere
and the numbers come out matching DGGRID's intent.

### 2. Routing data through the DuckDB extension

If you compute on cells in DuckDB using `igeo7_geo_to_authalic` and pull
the resulting `GEOMETRY` back into the browser as GeoJSON, you'll receive
authalic-latitude coordinates. To display them on a Cesium / MapLibre /
Leaflet basemap, round-trip them with `igeo7TransformGeoJson(fc, 'authalicToGeo')`
before feeding the layer.

```ts
const fcFromDuck = JSON.parse(await fetchAuthalicGeometryFromDuckDB())
const fcForDisplay = dggs.igeo7TransformGeoJson(fcFromDuck, 'authalicToGeo')
geoJsonLayer.setData(fcForDisplay)
```

### 3. Showing the difference visually

The shift is small but well-defined. Below, pick a latitude and resolution
to see how a real DGGS cell at that latitude moves under the conversion.
The "DGGRID claimed area" is `cellAreaKM` (authalic); the two computed
areas are spherical excess applied to the geodetic and authalic vertex
rings on a uniform sphere of the WGS84 authalic radius.

#### Does it change shape, or just position?

Both — but mostly the latter. The transform is `(lng, lat) → (lng, ξ(lat))`
with longitude untouched, so for a cell that spans only a small latitude
range every vertex shifts by *almost* the same amount → near-pure
translation in lat, no visible shape change. Cells that span a wider lat
range (polar caps, low-resolution cells) see vertices at different lats
shift by slightly different amounts because `dξ/dφ` is non-constant —
that's the shape distortion. It's typically <0.001° across one cell.

The interactive below has an "Amplify shape diff" slider so you can crank
the residual (per-vertex shift minus the mean) up to 2000× and *see* the
otherwise-imperceptible distortion. The edge-length table beneath confirms
the same effect numerically — if the conversion were a rigid translation,
every edge's percent change would be identical; the variation tells you
the cell is actually being deformed.

<ClientOnly>
  <AuthalicDemo />
</ClientOnly>

## Implementation notes

- **Algorithm**: Karney (2022) sixth-order polynomial. Round-trip error is
  well under `1e-9°` across the full latitude range.
- **Symmetry**: `f(-φ) === -f(φ)` — the transform is odd. The equator and
  both poles are fixed points (within `1e-9°` for the poles).
- **Mutation**: `igeo7TransformGeoJson` deep-clones its input. Geometries
  with `null` or unsupported `type` strings are returned unchanged.
- **DuckDB parity**: scalar values match the upstream `igeo7_geo_to_authalic`
  / `igeo7_authalic_to_geo` SQL functions to floating-point precision.

`sphericalExcess` is a short helper that's the same in both code samples
above — see [`docs/.vitepress/theme/components/AuthalicDemo.vue`](https://github.com/am2222/webDggrid/blob/main/docs/.vitepress/theme/components/AuthalicDemo.vue)
for a copy-pasteable implementation.
