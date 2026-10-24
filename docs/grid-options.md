# Projections, Datums & Presets

WebDggrid 2.0 is built on DGGRID 9.1, which adds two projections, a WGS84
datum, a custom sphere radius, named orientations and a family of preset
grids. All of them are set through the same [`IDGGSProps`](api/interfaces/IDGGSProps.md) object you
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

`dggsPreset(name)` returns the full [`IDGGSProps`](api/interfaces/IDGGSProps.md) for a DGGRID 9.1
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
| `Z` | Hierarchically indexed (after `S` or `L`, hexagons only). The grid is the same as without `Z`; WebDggrid exposes Z3 / ZORDER / Z7 for every grid that supports them. |

Supported names:

- `ISEA` and `IVEA` with `3H`, `4H`, `7H`, `4T`, `4D`, and `S` / `L` suffixes,
  plus `Z` on the hexagon grids (e.g. `ISEA4HS`, `IVEA7HL`, `ISEA3HSZ`)
- `FULLER3H`, `FULLER4H`, `FULLER7H`, `FULLER4T`, `FULLER4D` (DYMAXION orientation)
- `IGEO7v1` = `ISEA7HSZ` (authalic sphere) and `IGEO7v2` = `ISEA7HLZ` (WGS84)
- `PLANETRISK` (aperture sequence `43334777777777777777777`)

Not supported: the mixed-aperture `…43H` grids, `SUPERFUND`, and `H3`.
DGGRID 9.1 made the bare name `IGEO7` an alias for `IGEO7v2` (it used to mean
`IGEO7v1`), so `dggsPreset` rejects it: name the version you mean.

::: tip
The preset objects are plain data. Spread one and override fields to start
from a preset: `{ ...dggsPreset('ISEA7HL'), projection: Projection.IVEA }`.
:::
