[webdggrid](../globals.md) / Datum

# Enumeration: Datum

Defined in: [webdggrid.ts:78](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L78)

How geographic (`[lng, lat]`) coordinates passed in and returned are
interpreted.

DGGRID always builds the grid on a sphere. With `AUTHALIC_SPHERE` (the
default, and the only behaviour before 2.0) coordinates are taken as
positions on that sphere unchanged. With `WGS84` they are WGS84 geodetic
coordinates: latitudes are converted to the authalic sphere on input and
back on output, so the grid stays exactly equal-area on the ellipsoid.
This is what DGGRID's ellipsoidal (`…L`) presets and IGEO7v2 use.

## Enumeration Members

### AUTHALIC\_SPHERE

> **AUTHALIC\_SPHERE**: `"AUTHALIC_SPHERE"`

Defined in: [webdggrid.ts:80](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L80)

Coordinates are on the grid sphere (no conversion).

***

### WGS84

> **WGS84**: `"WGS84"`

Defined in: [webdggrid.ts:82](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L82)

Coordinates are WGS84 geodetic; latitudes are converted to/from authalic.
