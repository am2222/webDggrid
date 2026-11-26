[webdggrid](../globals.md) / GeodesicInverse

# Interface: GeodesicInverse

Defined in: [webdggrid.ts:107](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L107)

Result of [Webdggrid.geodesicInverse](../classes/Webdggrid.md#geodesicinverse): the shortest path between two
points in the grid's [Datum](../enumerations/Datum.md).

## Properties

### azimuth

> **azimuth**: `number`

Defined in: [webdggrid.ts:115](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L115)

Forward azimuth at the start point in degrees, clockwise from north, in
(-180, 180]. 0 for coincident points. At a pole it is relative to the
meridian of the longitude given for that point.

***

### distanceKM

> **distanceKM**: `number`

Defined in: [webdggrid.ts:109](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L109)

Length of the geodesic in km.
