[webdggrid](../globals.md) / DggsPresetName

# Type Alias: DggsPresetName

> **DggsPresetName** = \`$\{"ISEA" \| "IVEA"\}$\{"3H" \| "4H" \| "7H" \| "4T" \| "4D"\}$\{"" \| "S" \| "L"\}\` \| \`$\{"ISEA" \| "IVEA"\}$\{"3H" \| "4H" \| "7H"\}$\{"S" \| "L"\}Z\` \| `"ISEA4DSZ"` \| `"IVEA4DSZ"` \| `"IVEA4DLZ"` \| `"FULLER4DZ"` \| \`$\{"ISEA" \| "IVEA"\}4T$\{"S" \| "L"\}Q\` \| `"FULLER4TQ"` \| \`FULLER$\{"3H" \| "4H" \| "7H" \| "4T" \| "4D"\}$\{"" \| "S"\}\` \| `"IGEO7v1"` \| `"IGEO7v2"` \| `"PLANETRISK"`

Defined in: [webdggrid.ts:359](https://github.com/am2222/webDggrid/blob/52d49d8b04b1ed1db4f85a716269bf05d2f4e8cf/src-ts/webdggrid.ts#L359)

DGGRID 9.31 preset grid names (`dggs_type`) that WebDggrid supports.

Names are `<projection><aperture><topology>` plus suffixes:
- `S` — spherical: authalic-sphere coordinates and the ISEA orientation.
  The unsuffixed legacy names (e.g. `ISEA4H`) are the same grids.
- `L` — ellipsoidal: WGS84 coordinates ([Datum.WGS84](../enumerations/Datum.md#wgs84)) and the ISEAL
  orientation.
- `Z` — hierarchically indexed (Z3 / ZORDER / Z7 by aperture; ZORDER for
  the aperture 4 diamond presets `ISEA4DSZ`, `IVEA4DSZ`, `IVEA4DLZ`,
  `FULLER4DZ`).
- `Q` — QUADTREE indexed aperture 4 triangle grids (DGGRID 9.3):
  `ISEA4TSQ`, `IVEA4TSQ`, `ISEA4TLQ`, `IVEA4TLQ`, `FULLER4TQ`.

`Z`/`Q` grids are the same as without the suffix; WebDggrid exposes every
index for every grid that supports it. `FULLER…S` (DGGRID 9.3) are aliases
of the plain `FULLER…` names.

`IGEO7v1` is `ISEA7HSZ` and `IGEO7v2` is `ISEA7HLZ`. The mixed-aperture
`…43H` grids, SUPERFUND, and H3 are not supported.
