[webdggrid](../index.md) / Webdggrid

# Class: Webdggrid

## Constructors

### new Webdggrid(_module)

> **`private`** **new Webdggrid**(`_module`): [`Webdggrid`](Webdggrid.md)

#### Parameters

• **\_module**: `any`

#### Returns

[`Webdggrid`](Webdggrid.md)

#### Source

[webdggrid.ts:54](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L54)

## Properties

### \_module

> **`protected`** **\_module**: `any`

#### Source

[webdggrid.ts:54](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L54)

***

### dggs

> **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

#### Source

[webdggrid.ts:51](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L51)

***

### resolution

> **resolution**: `number` = `DEFAULT_RESOLUTION`

#### Source

[webdggrid.ts:52](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L52)

## Methods

### \_arrayToVector()

> **\_arrayToVector**(`array`): `any`

#### Parameters

• **array**: `any`

#### Returns

`any`

#### Source

[webdggrid.ts:334](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L334)

***

### \_is2dArray()

> **\_is2dArray**(`array`): `boolean`

#### Parameters

• **array**: `any`

#### Returns

`boolean`

#### Source

[webdggrid.ts:332](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L332)

***

### \_main()

> **\_main**(): `any`

test function

#### Returns

`any`

#### Memberof

WebDggrid

#### Source

[webdggrid.ts:120](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L120)

***

### \_vectorToArray()

> **\_vectorToArray**(`vector`): `any`[]

#### Parameters

• **vector**: `any`

#### Returns

`any`[]

#### Source

[webdggrid.ts:347](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L347)

***

### \_wVectorToArray()

> **\_wVectorToArray**(`vector`): `any`[]

#### Parameters

• **vector**: `any`

#### Returns

`any`[]

#### Source

[webdggrid.ts:349](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L349)

***

### cellAreaKM()

> **cellAreaKM**(`resolution`): `number`

#### Parameters

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Source

[webdggrid.ts:153](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L153)

***

### cellDistKM()

> **cellDistKM**(`resolution`): `number`

#### Parameters

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Source

[webdggrid.ts:175](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L175)

***

### geoToGeo()

> **geoToGeo**(`coordinates`, `resolution`): `number`[][]

Converts a set of coordinates to the cell centroid values

#### Parameters

• **coordinates**: `number`[][]

A 2d array of lng and lat values

• **resolution**: `number`= `DEFAULT_RESOLUTION`

[resolution=DEFAULT_RESOLUTION] The resolution of the dggs

#### Returns

`number`[][]

An array of dggs cell centroid coordinates

#### Source

[webdggrid.ts:296](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L296)

***

### geoToSequenceNum()

> **geoToSequenceNum**(`coordinates`, `resolution`): `bigint`[]

Converts an array of geography coordinates to the list of the sequence numbers AKA DggId

#### Parameters

• **coordinates**: `number`[][]

A 2d array of [[lng, lat]] values

• **resolution**: `number`= `DEFAULT_RESOLUTION`

[resolution=DEFAULT_RESOLUTION] The dggs resolution

#### Returns

`bigint`[]

An array of the DggIds

#### Source

[webdggrid.ts:224](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L224)

***

### getResolution()

> **getResolution**(): `number`

Get the resolution of the current dggs

#### Returns

`number`

the current dggs resolution

#### Memberof

WebDggrid

#### Source

[webdggrid.ts:102](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L102)

***

### gridStatCLS()

> **gridStatCLS**(`resolution`): `number`

#### Parameters

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Source

[webdggrid.ts:197](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L197)

***

### nCells()

> **nCells**(`resolution`?): `number`

#### Parameters

• **resolution?**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Follow

Hi
Returns the number of the cells in specific resolution

#### Memberof

WebDggrid

#### Source

[webdggrid.ts:131](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L131)

***

### sequenceNumToGeo()

> **sequenceNumToGeo**(`sequenceNum`, `resolution`): `number`[][]

Convert a sequence number to the [lng,lat] of the center of the related cell

#### Parameters

• **sequenceNum**: `bigint`[]

• **resolution**: `number`= `DEFAULT_RESOLUTION`

[resolution=DEFAULT_RESOLUTION]

#### Returns

`number`[][]

An array of [lng,lat]

#### Source

[webdggrid.ts:259](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L259)

***

### setDggs()

> **setDggs**(`dggs`, `resolution`): `void`

Set the main dggs configuration

#### Parameters

• **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md)= `DEFAULT_DGGS`

A dggs object

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`void`

#### Source

[webdggrid.ts:92](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L92)

***

### setResolution()

> **setResolution**(`resolution`?): `void`

Set the resolution of the dggs

#### Parameters

• **resolution?**: `number`

the resolution. It should be a valid integer

#### Returns

`void`

#### Memberof

WebDggrid

#### Source

[webdggrid.ts:110](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L110)

***

### version()

> **version**(): `string`

#### Returns

`string`

The Webdggrid c++ version

#### Source

[webdggrid.ts:84](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L84)

***

### load()

> **`static`** **load**(): `Promise`\<*typeof* [`Webdggrid`](Webdggrid.md)\>

Compiles and instantiates the raw wasm.

::: info
In general WebAssembly compilation is disallowed on the main thread if the buffer size is larger than 4KB, hence forcing `load` to be asynchronous;
:::

#### Returns

`Promise`\<*typeof* [`Webdggrid`](Webdggrid.md)\>

A promise to an instance of the Webdggrid class.

#### Source

[webdggrid.ts:68](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L68)

***

### unload()

> **`static`** **unload**(): `void`

Unloades the compiled wasm instance.

#### Returns

`void`

#### Source

[webdggrid.ts:77](https://github.com/am2222/webDggrid/blob/cd7f74a/src-ts/webdggrid.ts#L77)
