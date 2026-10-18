# Contributing

Pull requests are welcome!

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation. Use the following prefixes in your commit messages:

| Prefix | Version bump | Example |
|---|---|---|
| `fix: …` | patch (1.0.x) | `fix: correct cell resolution output` |
| `feat: …` | minor (1.x.0) | `feat: add ISEA4T grid support` |
| `feat!: …` / `fix!: …` | major (x.0.0) | `feat!: rename cellToChildren` |

A release PR is opened automatically by the bot after commits land on `main`. Merging it creates the GitHub release and publishes to npm.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Yarn](https://yarnpkg.com/) (via corepack: `corepack enable`)
- [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) 6.0.12 (the version CI pins)

### Project Structure

| Folder | Description |
|---|---|
| `src-cpp` | DGGRID C++ source (inspired by DGGRIDR) |
| `src-ts` | TypeScript wrapper around the Emscripten output |
| `lib-wasm` | JS/WASM output from Emscripten |
| `lib-wasm-py` | Experimental Python wrapper build |
| `tests` | JS unit tests |

### Build

```bash
yarn install
yarn build
```

This compiles the WASM via Emscripten and builds the TypeScript wrapper and bundles.

DGGRID is compiled in `double` precision. Its sources use `long double`, which on WebAssembly is a software-emulated 128-bit type, so the build copies `dglib`/`proj4lib` into the build directory with `long double` rewritten to `double` (see `cmake/DggridDoublePrecision.cmake`; the submodule is not modified). This makes grid generation about 9× and point binning about 20× faster. To build with DGGRID's original `long double`, configure CMake with `-DDGGRID_DOUBLE_PRECISION=OFF`.

### Test

```bash
yarn test
```

