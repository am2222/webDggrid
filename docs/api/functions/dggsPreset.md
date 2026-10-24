[webdggrid](../globals.md) / dggsPreset

# Function: dggsPreset()

> **dggsPreset**(`name`): [`IDGGSProps`](../interfaces/IDGGSProps.md)

Defined in: [webdggrid.ts:331](https://github.com/am2222/webDggrid/blob/580262862c407d886c0c501445632ae6dc75bc82/src-ts/webdggrid.ts#L331)

Returns the [IDGGSProps](../interfaces/IDGGSProps.md) of a DGGRID preset grid (DGGRID's
`dggs_type`), for [Webdggrid.setDggs](../classes/Webdggrid.md#setdggs).

Unlike DGGRID, `IVEA…` names without `S`/`L` are accepted as the spherical
grids, and the bare name `IGEO7` is rejected: DGGRID 9.1 changed it from
`IGEO7v1` to `IGEO7v2`, so say which one you mean.

## Parameters

### name

[`DggsPresetName`](../type-aliases/DggsPresetName.md)

## Returns

[`IDGGSProps`](../interfaces/IDGGSProps.md)

## Example

```ts
import { Webdggrid, dggsPreset } from 'webdggrid/Webdggrid';

const dggs = await Webdggrid.load();
dggs.setDggs(dggsPreset('IGEO7v2'), 9);   // ISEA7H on WGS84
```

## Throws

If the name is not a supported preset.
