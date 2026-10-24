[webdggrid](../globals.md) / orientationPreset

# Function: orientationPreset()

> **orientationPreset**(`preset`): `object`

Defined in: [webdggrid.ts:286](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L286)

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
