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

[src-ts/webdggrid.ts:70](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L70)

## Properties

### \_module

> **`protected`** **\_module**: `any`

#### Source

[src-ts/webdggrid.ts:70](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L70)

***

### dggs

> **dggs**: [`IDGGSProps`](../interfaces/IDGGSProps.md) = `DEFAULT_DGGS`

#### Source

[src-ts/webdggrid.ts:67](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L67)

***

### resolution

> **resolution**: `number` = `DEFAULT_RESOLUTION`

#### Source

[src-ts/webdggrid.ts:68](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L68)

## Methods

### \_main()

> **\_main**(): `any`

test function

#### Returns

`any`

#### Memberof

WebDggrid

#### Source

[src-ts/webdggrid.ts:136](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L136)

***

### cellAreaKM()

> **cellAreaKM**(`resolution`): `number`

#### Parameters

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Source

[src-ts/webdggrid.ts:169](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L169)

***

### cellDistKM()

> **cellDistKM**(`resolution`): `number`

#### Parameters

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Source

[src-ts/webdggrid.ts:191](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L191)

***

### geoToGeo()

> **geoToGeo**(`coordinates`, `resolution`): `Position`[]

Converts a set of coordinates to the cell centroid values

#### Parameters

• **coordinates**: `number`[][]

A 2d array of lng and lat values

• **resolution**: `number`= `DEFAULT_RESOLUTION`

[resolution=DEFAULT_RESOLUTION] The resolution of the dggs

#### Returns

`Position`[]

An array of dggs cell centroid coordinates

#### Source

[src-ts/webdggrid.ts:312](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L312)

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

[src-ts/webdggrid.ts:240](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L240)

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

[src-ts/webdggrid.ts:118](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L118)

***

### gridStatCLS()

> **gridStatCLS**(`resolution`): `number`

#### Parameters

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`number`

#### Source

[src-ts/webdggrid.ts:213](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L213)

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

[src-ts/webdggrid.ts:147](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L147)

***

### sequenceNumToGeo()

> **sequenceNumToGeo**(`sequenceNum`, `resolution`): `Position`[]

Convert a sequence number to the [lng,lat] of the center of the related cell

#### Parameters

• **sequenceNum**: `bigint`[]

• **resolution**: `number`= `DEFAULT_RESOLUTION`

[resolution=DEFAULT_RESOLUTION]

#### Returns

`Position`[]

An array of [lng,lat]

#### Source

[src-ts/webdggrid.ts:275](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L275)

***

### sequenceNumToGrid()

> **sequenceNumToGrid**(`sequenceNum`, `resolution`): `Position`[][]

Convert an array of sequence numbers to the grid coordinates with format of `[lng,lat]`. The output is an array with the same
size as input `sequenceNum` and it includes an array of `CoordinateLike` objects.

#### Parameters

• **sequenceNum**: `bigint`[]

• **resolution**: `number`= `DEFAULT_RESOLUTION`

[resolution=DEFAULT_RESOLUTION]

#### Returns

`Position`[][]

An array of [lng,lat]

#### Source

[src-ts/webdggrid.ts:355](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L355)

***

### sequenceNumToGridFeatureCollection()

> **sequenceNumToGridFeatureCollection**(`sequenceNum`, `resolution`): `FeatureCollection`\<`Polygon`, `Object` & `Object`\>

#### Parameters

• **sequenceNum**: `bigint`[]

• **resolution**: `number`= `DEFAULT_RESOLUTION`

#### Returns

`FeatureCollection`\<`Polygon`, `Object` & `Object`\>

#### Source

[src-ts/webdggrid.ts:414](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L414)

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

[src-ts/webdggrid.ts:108](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L108)

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

[src-ts/webdggrid.ts:126](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L126)

***

### version()

> **version**(): `string`

#### Returns

`string`

The Webdggrid c++ version

#### Source

[src-ts/webdggrid.ts:100](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L100)

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

[src-ts/webdggrid.ts:84](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L84)

***

### unload()

> **`static`** **unload**(): `void`

Unloades the compiled wasm instance.

#### Returns

`void`

#### Source

[src-ts/webdggrid.ts:93](https://github.com/am2222/webDggrid/blob/a437321/src-ts/webdggrid.ts#L93)
