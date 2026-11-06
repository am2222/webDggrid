[webdggrid](../globals.md) / DggsPresetName

# Type Alias: DggsPresetName

> **DggsPresetName** = \`$\{"ISEA" \| "IVEA"\}$\{"3H" \| "4H" \| "7H" \| "4T" \| "4D"\}$\{"" \| "S" \| "L"\}\` \| \`$\{"ISEA" \| "IVEA"\}$\{"3H" \| "4H" \| "7H"\}$\{"S" \| "L"\}Z\` \| \`FULLER$\{"3H" \| "4H" \| "7H" \| "4T" \| "4D"\}\` \| `"IGEO7v1"` \| `"IGEO7v2"` \| `"PLANETRISK"`

Defined in: [webdggrid.ts:336](https://github.com/am2222/webDggrid/blob/36270011ea3d704cc993ef6f7202c9db27b0acbd/src-ts/webdggrid.ts#L336)

DGGRID 9.1 preset grid names (`dggs_type`) that WebDggrid supports.

Names are `<projection><aperture><topology>` plus suffixes:
- `S` — spherical: authalic-sphere coordinates and the ISEA orientation.
  The unsuffixed legacy names (e.g. `ISEA4H`) are the same grids.
- `L` — ellipsoidal: WGS84 coordinates ([Datum.WGS84](../enumerations/Datum.md#wgs84)) and the ISEAL
  orientation.
- `Z` — hierarchically indexed (Z3 / ZORDER / Z7 by aperture). The grid is
  the same as without `Z`; WebDggrid exposes every index for every grid
  that supports it.

`IGEO7v1` is `ISEA7HSZ` and `IGEO7v2` is `ISEA7HLZ`. The mixed-aperture
`…43H` grids, SUPERFUND, and H3 are not supported.
