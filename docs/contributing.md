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
- [Emscripten](https://emscripten.org/docs/getting_started/downloads.html)

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

### Test

```bash
yarn test
```

### Serve the Emscripten output (development only)

```bash
yarn serve
```

Opens the Emscripten default page — navigate to `libdggrid.html` to test the raw WASM. You can invoke functions directly:

```js
Module.DgGEO_to_SEQNUM(0, 0, 0, 4, 10, 'HEXAGON', 'ISEA', [0], [0])
```
