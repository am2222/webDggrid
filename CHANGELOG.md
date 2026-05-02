# Changelog

## [1.9.0](https://github.com/am2222/webDggrid/compare/v1.8.0...v1.9.0) (2026-05-02)


### Features

* Added cesium as demo ([46d3220](https://github.com/am2222/webDggrid/commit/46d3220e4b260396a281ac7fc8c31a562326bb54))
* Enhance DGGS functionality with authalic latitude conversion and GeoJSON support ([9331596](https://github.com/am2222/webDggrid/commit/93315961490bf7f17751490c6e9666d0f128a580))
* improved demo ([5df111c](https://github.com/am2222/webDggrid/commit/5df111c3c6208028d868e6f203c8249d154b0342))


### Bug Fixes

* changed globe colors ([0a5f9d5](https://github.com/am2222/webDggrid/commit/0a5f9d50289ce6f618f3e042b437d7feb1bac77f))
* fix the over pole cell bug ([62544b2](https://github.com/am2222/webDggrid/commit/62544b244ecf036037149f81bc90e0fa7718511e))

## [1.8.0](https://github.com/am2222/webDggrid/compare/v1.7.0...v1.8.0) (2026-04-25)


### Features

* add igeo7_duckdb submodule for enhanced functionality ([6a20c6a](https://github.com/am2222/webDggrid/commit/6a20c6a662c56fec4ef89c53e60cb9df7b144cb1))
* add IGEO7/Z7 hexagonal hierarchical index support ([f3b93b4](https://github.com/am2222/webDggrid/commit/f3b93b4574858938866d0f33dc8f2045cd2b550a))

## [1.7.0](https://github.com/am2222/webDggrid/compare/v1.6.0...v1.7.0) (2026-04-07)


### Features

* add sequenceNumAllParents method to retrieve all parent cells for given child cells ([7917cb4](https://github.com/am2222/webDggrid/commit/7917cb44f49dfd54c006cb0b682993cf9f954743))
* optimize parent cell retrieval by converting child cell center to GEO and then to SEQNUM ([3579dfb](https://github.com/am2222/webDggrid/commit/3579dfb7e3c2bffc807aae448b47bef20e7b9865))

## [1.6.0](https://github.com/am2222/webDggrid/compare/v1.5.0...v1.6.0) (2026-04-07)


### Features

* add cell index type selection and address conversion display in DGGs demo ([0863df8](https://github.com/am2222/webDggrid/commit/0863df8ccdd1579f92180e51f443be11a6713e55))
* add DggsAddressTypesDemo component and integrate into documentation for address type conversions ([2f5821b](https://github.com/am2222/webDggrid/commit/2f5821bbc55cfb601e927eb774448818ff915a75))
* add hierarchical address types and conversions ([e745d5a](https://github.com/am2222/webDggrid/commit/e745d5aa0fa0f6acb48e4f9929c7c253d449e5f4))
* add hierarchy selection panel with index type and clear functionality ([380e8bc](https://github.com/am2222/webDggrid/commit/380e8bc45695c416ff6d3c6470f98613355fa6e6))
* add Index Arithmetic documentation and link in the configuration ([1b111bb](https://github.com/am2222/webDggrid/commit/1b111bb76a7f92c22a210a62034b26b97629e955))
* add methods for retrieving neighboring and hierarchical cells with comprehensive tests ([795f3a9](https://github.com/am2222/webDggrid/commit/795f3a9b33ff81e6beb4ff0a30a6bc336a279000))
* add multi-aperture grid support with comprehensive documentation and examples ([ef72c0f](https://github.com/am2222/webDggrid/commit/ef72c0f6113e3dbf1eef4fa355468bbe10de21f7))
* enhance child retrieval methods to support hexagonal grids and update related tests ([be5ab49](https://github.com/am2222/webDggrid/commit/be5ab49e790abe0fc1eab14635b27cb61e4c3df4))
* enhance DGGs settings with dynamic controls and improved error handling ([0bedb7b](https://github.com/am2222/webDggrid/commit/0bedb7b2a03aa35534e43983457dcacab238c31b))
* enhance hierarchy panel with improved layout and clear selection functionality ([100e444](https://github.com/am2222/webDggrid/commit/100e4444658ed54e2c1c737dfca7e8b00f4c6101))
* enhance index digit manipulation methods and update documentation for Z3, Z7, and ZORDER ([f50f3f4](https://github.com/am2222/webDggrid/commit/f50f3f40befd48cf68128b88f5f1f1db271dc890))
* enhance UI with theme-aware address highlighting and improve layout padding ([5384c1e](https://github.com/am2222/webDggrid/commit/5384c1eb8cd9a016b82f0a596746d4abbc2fae73))
* implement Bitarithmetic demonstration with Z3 and Z7 arithmetic calculations ([4c6b180](https://github.com/am2222/webDggrid/commit/4c6b1803d6333f432107860429c9a733bd4c444d))
* Implement bitwise operations for Z3, Z7, and ZORDER indices; add helper functions for digit manipulation and extraction ([e81ee6d](https://github.com/am2222/webDggrid/commit/e81ee6def3e910c6f554d37b94f52e088ae70014))
* implement hierarchical address types (VERTEX2DD, ZORDER, Z3, Z7) with conversions and WASM bindings ([a01ee42](https://github.com/am2222/webDggrid/commit/a01ee42e248ecce0b2ca21295b8ac4b65d0bd6a7))
* implement hierarchy layer removal and sanitize feature collections in DggsGlobe component ([83a37ad](https://github.com/am2222/webDggrid/commit/83a37ad02f8689ac02a7c0043a4170eb13037679))
* implement loadWebdggrid utility for dynamic loading of Webdggrid class and update components to use it ([5a64660](https://github.com/am2222/webDggrid/commit/5a64660de1789d5b07cde9b5af0f0d1a5e7ad0f9))
* update applySettings function to be asynchronous and ensure SVG rendering before processing ([1795816](https://github.com/am2222/webDggrid/commit/1795816cdeb40d5ae7b0314e000ace5a364468b3))
* update documentation links and add geometry notes for pentagonal cells and antimeridian handling ([4767dd8](https://github.com/am2222/webDggrid/commit/4767dd867676f329a94df225806d5e0d24eb0c26))


### Bug Fixes

* ensure counts are converted to numbers in neighbor and child retrieval methods ([70f3fdb](https://github.com/am2222/webDggrid/commit/70f3fdbdb8ed4476a516efa51e379862b05734ff))
* remove redundant styles from loadScript function in DggsAddressTypesDemo.vue ([396afd7](https://github.com/am2222/webDggrid/commit/396afd70d34dbf6cc5b7b8ae83aad1638b4d6bc3))

## [1.5.0](https://github.com/am2222/webDggrid/compare/v1.4.0...v1.5.0) (2026-04-04)


### Features

* add DggsD3Globe and DggsGlobe components for interactive globe visualization ([7e1c977](https://github.com/am2222/webDggrid/commit/7e1c9777c290f697ec86a4809eb28d793f53c8f0))
* add DggsD3Globe and DggsGlobe components for interactive globe visualization ([75bc2fa](https://github.com/am2222/webDggrid/commit/75bc2fac9ad2eaff4fb3dadd680ad9ada8e89ef8))
* add smoke test for built dist/ output and integrate into deployment workflow ([fecfa7d](https://github.com/am2222/webDggrid/commit/fecfa7def8ce5fe564f8b4a78456b17fa4268b10))
* add tsBuildInfoFile option to TypeScript configuration ([1019811](https://github.com/am2222/webDggrid/commit/1019811cca726918ae98e0fe986c3aab85b2a377))
* add verification job for published package and enhance smoke test documentation ([96fc7e8](https://github.com/am2222/webDggrid/commit/96fc7e870b1563229f8a2382b6028abfb85d853e))
* enhance DggsD3Globe and DggsGlobe components with dynamic background color and improved button integration ([d96a97f](https://github.com/am2222/webDggrid/commit/d96a97f1498972e5fff3d1e1968c77080265fd1d))
* enhance smoke test for published package and add forward declaration in webdggrid.cpp ([9a8e50c](https://github.com/am2222/webDggrid/commit/9a8e50cc21ba32b28a87ca3d075728e7100d9cfc))
* ensure directory creation for ESM output before writing wasm.js file ([ab479c5](https://github.com/am2222/webDggrid/commit/ab479c54521c1b3ea909516f2c295c7360505011))
* Remove deprecated WASM and TypeScript definitions for DGGRID library ([7e7af1e](https://github.com/am2222/webDggrid/commit/7e7af1e009b3cfd47c1e980c0da1767051ec07ef))
* update build script to include WASM compilation step ([105303d](https://github.com/am2222/webDggrid/commit/105303dff669c4bd500584001f61cbd46d2a4ef6))
* update deployment workflow and improve package configuration for better documentation and library loading ([33e6455](https://github.com/am2222/webDggrid/commit/33e645515869d33f5bded6619374535630992e82))
* update emsdk version to v14 in CI workflows ([dc734cb](https://github.com/am2222/webDggrid/commit/dc734cb5cc17b18aa0dd7ced975192ee56381c53))


### Bug Fixes

* add .vitepress to .gitignore to prevent unnecessary files from being tracked ([a6b8cd4](https://github.com/am2222/webDggrid/commit/a6b8cd4012debbc498d65ca4dc0d8036b6cb60cc))
* remove DggsGlobe, DggsHeroBackground, and globeUtils components ([89f0ca9](https://github.com/am2222/webDggrid/commit/89f0ca97444857a4eb709bf000551811a3e2ea5d))

## [1.4.0](https://github.com/am2222/webDggrid/compare/v1.3.0...v1.4.0) (2026-04-04)


### Features

* Refactor code structure for improved readability and maintainab… ([c438672](https://github.com/am2222/webDggrid/commit/c438672bf7752baa7c10fbe4a0356a04f4acaecf))
* Refactor code structure for improved readability and maintainability ([835ace3](https://github.com/am2222/webDggrid/commit/835ace3b53bbc429527dbf13b88cae3a316fd057))

## [1.3.0](https://github.com/am2222/webDggrid/compare/v1.2.1...v1.3.0) (2026-04-02)


### Features

* Implement deploy-docs workflow for GitHub Pages deployment ([3921ce3](https://github.com/am2222/webDggrid/commit/3921ce32781d427d8978256c5770286db9db2e93))

## [1.2.1](https://github.com/am2222/webDggrid/compare/v1.2.0...v1.2.1) (2026-04-02)


### Bug Fixes

* Update documentation badge links in README for accuracy ([c3491df](https://github.com/am2222/webDggrid/commit/c3491dfc423ed842b969691223ade55c26ce8d7d))

## [1.2.0](https://github.com/am2222/webDggrid/compare/v1.1.1...v1.2.0) (2026-04-02)


### Features

* Replace CI and deploy workflows with new configurations and add PR check workflow ([c0e970e](https://github.com/am2222/webDggrid/commit/c0e970e057e0651634fe0ea26c754e3803819394))


### Bug Fixes

* Update description in README and index.md for clarity and consistency ([89f27ec](https://github.com/am2222/webDggrid/commit/89f27ec7ac927488045f44896e60d45948137cda))

## [1.1.1](https://github.com/am2222/webDggrid/compare/v1.1.0...v1.1.1) (2026-04-02)


### Bug Fixes

* Update npm package badge link in README to point to the correct workflow ([554e20d](https://github.com/am2222/webDggrid/commit/554e20daf2f2e193d226dc73591243008b62a036))

## [1.1.0](https://github.com/am2222/webDggrid/compare/v1.0.9...v1.1.0) (2026-04-02)


### Features

* Add CI workflow for build and test automation ([3c33dd3](https://github.com/am2222/webDggrid/commit/3c33dd38b301665f11eb7689b9fb4e1c16a9ac62))
* Add CI workflow for build and test automation ([239bde1](https://github.com/am2222/webDggrid/commit/239bde14cc54e742ee91ea391507ffae58edb9f5))
* Refactor GitHub Actions workflow to improve npm package publishing and WASM asset handling ([c21f807](https://github.com/am2222/webDggrid/commit/c21f807f15182fd2a43d4d1086bcfd572e29162e))


### Bug Fixes

* Update token handling in release-please workflow to use fallback to github.token ([b08ff41](https://github.com/am2222/webDggrid/commit/b08ff41de6281c86aa4b5ab583167d6ad4d35e4f))
* Update token handling in release-please workflow to use fallback… ([4715fc7](https://github.com/am2222/webDggrid/commit/4715fc7b4cabaf1c0df5f0423b3725548afffeac))
