[webdggrid](../globals.md) / OrientationPreset

# Enumeration: OrientationPreset

Defined in: [webdggrid.ts:297](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L297)

A named icosahedron orientation (DGGRID `dggs_orient_preset`). Use with
[orientationPreset](../functions/orientationPreset.md) to fill `poleCoordinates` and `azimuth`.

## Enumeration Members

### DYMAXION

> **DYMAXION**: `"DYMAXION"`

Defined in: [webdggrid.ts:306](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L306)

Fuller's Dymaxion placement (R. W. Gray's coordinates). Vertex and face
numbering match H3's; used by the FULLER presets.

***

### ISEA

> **ISEA**: `"ISEA"`

Defined in: [webdggrid.ts:299](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L299)

Snyder's ISEA orientation: vertex at 11.25° E, atan(φ)° N, azimuth 0.

***

### ISEAL

> **ISEAL**: `"ISEAL"`

Defined in: [webdggrid.ts:301](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L301)

The ISEA orientation shifted to 11.20° E, used by the ellipsoidal (`…L`) presets.
