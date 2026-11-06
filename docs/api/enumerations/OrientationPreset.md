[webdggrid](../globals.md) / OrientationPreset

# Enumeration: OrientationPreset

Defined in: [webdggrid.ts:280](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L280)

A named icosahedron orientation (DGGRID `dggs_orient_preset`). Use with
[orientationPreset](../functions/orientationPreset.md) to fill `poleCoordinates` and `azimuth`.

## Enumeration Members

### DYMAXION

> **DYMAXION**: `"DYMAXION"`

Defined in: [webdggrid.ts:289](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L289)

Fuller's Dymaxion placement (R. W. Gray's coordinates). Vertex and face
numbering match H3's; used by the FULLER presets.

***

### ISEA

> **ISEA**: `"ISEA"`

Defined in: [webdggrid.ts:282](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L282)

Snyder's ISEA orientation: vertex at 11.25° E, atan(φ)° N, azimuth 0.

***

### ISEAL

> **ISEAL**: `"ISEAL"`

Defined in: [webdggrid.ts:284](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L284)

The ISEA orientation shifted to 11.20° E, used by the ellipsoidal (`…L`) presets.
