[webdggrid](../globals.md) / orientationPreset

# Function: orientationPreset()

> **orientationPreset**(`preset`): `object`

Defined in: [webdggrid.ts:315](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L315)

Returns the `poleCoordinates` and `azimuth` of a named orientation.

## Parameters

### preset

[`OrientationPreset`](../enumerations/OrientationPreset.md)

## Returns

`object`

### azimuth

> **azimuth**: `number`

### poleCoordinates

> **poleCoordinates**: [`Coordinate`](../interfaces/Coordinate.md)

## Example

```ts
dggs.setDggs({ ...orientationPreset(OrientationPreset.DYMAXION),
               aperture: 7, topology: Topology.HEXAGON,
               projection: Projection.GNOMONIC }, 5);
```
