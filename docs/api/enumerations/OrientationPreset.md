[webdggrid](../globals.md) / OrientationPreset

# Enumeration: OrientationPreset

Defined in: [webdggrid.ts:251](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L251)

A named icosahedron orientation (DGGRID `dggs_orient_preset`). Use with
[orientationPreset](../functions/orientationPreset.md) to fill `poleCoordinates` and `azimuth`.

## Enumeration Members

### DYMAXION

> **DYMAXION**: `"DYMAXION"`

Defined in: [webdggrid.ts:260](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L260)

Fuller's Dymaxion placement (R. W. Gray's coordinates). Vertex and face
numbering match H3's; used by the FULLER presets.

***

### ISEA

> **ISEA**: `"ISEA"`

Defined in: [webdggrid.ts:253](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L253)

Snyder's ISEA orientation: vertex at 11.25° E, atan(φ)° N, azimuth 0.

***

### ISEAL

> **ISEAL**: `"ISEAL"`

Defined in: [webdggrid.ts:255](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L255)

The ISEA orientation shifted to 11.20° E, used by the ellipsoidal (`…L`) presets.
