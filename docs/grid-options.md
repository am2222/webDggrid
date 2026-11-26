# Projections, Datums & Presets

WebDggrid is built on DGGRID 9.31. DGGRID 9.1 added two projections, a WGS84
datum, a custom sphere radius, named orientations and a family of preset
grids; 9.2 adds WGS84 ellipsoidal distances, and 9.3 adds geodesic cell
areas, a geodesic solver that works for every pair of points (see
[Distances, azimuths and areas](#distances-azimuths-and-areas)), and QUADTREE
and diamond ZORDER presets. All of them are set through the same [`IDGGSProps`](api/interfaces/IDGGSProps.md) object you
pass to `setDggs`.

```ts
import {
  Webdggrid, Projection, Datum, Topology,
  OrientationPreset, orientationPreset, dggsPreset,
} from 'webdggrid/Webdggrid'

const dggs = await Webdggrid.load()
```

## Projections

| `projection` | Equal-area | Notes |
|---|---|---|
| `ISEA` | yes | Icosahedral Snyder Equal Area. The default. |
| `IVEA` | yes | Icosahedral Vertex-oriented Equal Area: distortion is arranged around the icosahedron vertices rather than the face centres. |
| `FULLER` | no | Fuller/Dymaxion: lower shape distortion. |
| `GNOMONIC` | no | Icosahedral gnomonic: cell edges are great-circle arcs. This is the projection H3 uses. |

```ts
dggs.setDggs({
  ...orientationPreset(OrientationPreset.ISEA),
  aperture: 7,
  topology: Topology.HEXAGON,
  projection: Projection.IVEA,
}, 6)
```

## Datum

DGGRID always builds the grid on a sphere. `datum` says how the `[lng, lat]`
coordinates you pass in and get back relate to it:

- `Datum.AUTHALIC_SPHERE` (default, and the only behaviour before 2.0):
  coordinates are positions on the grid sphere, used unchanged.
- `Datum.WGS84`: coordinates are WGS84 geodetic. Latitudes are converted to
  the authalic sphere on the way in and back on the way out, so the grid is
  exactly equal-area on the WGS84 ellipsoid. Cell centres, vertices and
  GeoJSON output are all WGS84.

```ts
dggs.setDggs({ ...dggsPreset('ISEA7H'), datum: Datum.WGS84 }, 9)
const [cell] = dggs.geoToSequenceNum([[-73.9857, 40.7484]], 9) // WGS84 input
const ring = dggs.sequenceNumToGrid([cell], 9)[0]              // WGS84 output
```

The conversion is the same shift as
[`igeo7GeoToAuthalic`](./authalic.md): up to about 0.19° of latitude, zero
at the equator and the poles. With `AUTHALIC_SPHERE` you can still apply it
yourself.

## Distances, azimuths and areas

All of these work in the grid's datum: on the grid sphere for
`AUTHALIC_SPHERE` (so they follow `sphereRadiusKm`), and on the WGS84
ellipsoid for `WGS84`, using DGGRID 9.31's geodesic solver.

- `geoDistanceKM(from, to)`: the distance in km between each pair of points.
- `geodesicInverse(from, to)`: the distance plus the forward azimuth at the
  start point (degrees clockwise from north, in (-180, 180]).
- `geodesicDirect(from, azimuths, distancesKM)`: the point reached from each
  start point along the given azimuth after the given distance.
- `sequenceNumToAreaKM(ids, res, { densification })`: the area in km² of
  each cell, with geodesic edges between its vertices.
  `densification` (0–500) adds points along each edge first, so the measured
  boundary follows the projected cell edge more closely. `cellAreaKM(res)`
  is still the average cell area.

```ts
dggs.setDggs({ ...dggsPreset('ISEA4H'), datum: Datum.WGS84 }, 5)
const [km] = dggs.geoDistanceKM([[-74.006, 40.7128]], [[-0.1276, 51.5072]])
const [{ distanceKM, azimuth }] = dggs.geodesicInverse([[-74.006, 40.7128]], [[-0.1276, 51.5072]])
const [[lng, lat]] = dggs.geodesicDirect([[0, 0]], [90], [100]) // 100 km east
const [km2] = dggs.sequenceNumToAreaKM([1n], 5, { densification: 10 })
```

The solver converges for every pair of points, including antipodal ones.
With DGGRID 9.2 (webdggrid 2.1, Vincenty's method) a `WGS84` pair more
than 179° apart threw an error.

## Sphere radius

`sphereRadiusKm` sets the radius of the grid sphere. It only changes cell
areas and distances (`cellAreaKM`, `cellDistKM`, `gridStatCLS`); cell IDs and
coordinates are the same on any sphere. `0` or omitted means the WGS84
authalic radius, 6371.0072 km; otherwise use 1–10000 km. `Datum.WGS84`
requires the authalic radius.

```ts
dggs.setDggs({ ...dggsPreset('ISEA4H'), sphereRadiusKm: 1737.4 }, 5) // the Moon
dggs.cellAreaKM(5)
```

## Orientations

`orientationPreset()` returns the `poleCoordinates` and `azimuth` of a named
DGGRID orientation:

| Preset | Vertex 0 | Azimuth | Used by |
|---|---|---|---|
| `ISEA` | 11.25° E, 58.2825° N (atan φ) | 0° | spherical presets |
| `ISEAL` | 11.20° E, 58.2825° N | 0° | ellipsoidal (`…L`) presets |
| `DYMAXION` | 10.5362° E, 64.7000° N | 125.6877° | FULLER presets; matches H3's icosahedron |

Combined with `Projection.GNOMONIC`, the `DYMAXION` orientation gives grids
whose cells have H3's geometry, though WebDggrid addresses them with
sequence numbers, not H3 indexes.

## Preset grids

`dggsPreset(name)` returns the full [`IDGGSProps`](api/interfaces/IDGGSProps.md) for a DGGRID 9.31
`dggs_type`:

```ts
dggs.setDggs(dggsPreset('IGEO7v2'), 9)
```

Names are `<projection><aperture><topology>` plus optional suffixes:

| Suffix | Meaning |
|---|---|
| none | Spherical. The legacy names (`ISEA4H`, …) are the same as `…S`. |
| `S` | Spherical: `Datum.AUTHALIC_SPHERE`, ISEA orientation. |
| `L` | Ellipsoidal: `Datum.WGS84`, ISEAL orientation. |
| `Z` | Hierarchically indexed: Z3 / ZORDER / Z7 on the `S`/`L` hexagon grids, ZORDER on the diamond grids `ISEA4DSZ`, `IVEA4DSZ`, `IVEA4DLZ`, `FULLER4DZ`. |
| `Q` | QUADTREE indexed triangle grids (DGGRID 9.3): `ISEA4TSQ`, `IVEA4TSQ`, `ISEA4TLQ`, `IVEA4TLQ`, `FULLER4TQ`. |

A `Z` or `Q` grid is the same grid as without the suffix; WebDggrid exposes
every index for every grid that supports it.

Supported names:

- `ISEA` and `IVEA` with `3H`, `4H`, `7H`, `4T`, `4D`, and `S` / `L` suffixes,
  plus `Z` on the hexagon grids (e.g. `ISEA4HS`, `IVEA7HL`, `ISEA3HSZ`)
- the indexed diamond and triangle grids listed under `Z` and `Q` above.
  DGGRID defines no `ISEA4DLZ`, so neither does `dggsPreset`.
- `FULLER3H`, `FULLER4H`, `FULLER7H`, `FULLER4T`, `FULLER4D` (DYMAXION
  orientation) and their DGGRID 9.3 aliases `FULLER3HS` … `FULLER4DS`
- `IGEO7v1` = `ISEA7HSZ` (authalic sphere) and `IGEO7v2` = `ISEA7HLZ` (WGS84)
- `PLANETRISK` (aperture sequence `43334777777777777777777`)

Not supported: the mixed-aperture `…43H` grids, `SUPERFUND`, and `H3`.
DGGRID 9.1 made the bare name `IGEO7` an alias for `IGEO7v2` (it used to mean
`IGEO7v1`), so `dggsPreset` rejects it: name the version you mean.

::: tip
The preset objects are plain data. Spread one and override fields to start
from a preset: `{ ...dggsPreset('ISEA7HL'), projection: Projection.IVEA }`.
:::
