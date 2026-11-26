[webdggrid](../globals.md) / orientationPreset

# Function: orientationPreset()

> **orientationPreset**(`preset`): `object`

Defined in: [webdggrid.ts:332](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L332)

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
