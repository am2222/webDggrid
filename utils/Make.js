// Build script — compiles the DGGRID WASM library via CMake + Emscripten.
//
// Usage:
//   node ./utils/Make            # release builds for both targets
//   node ./utils/Make --debug    # debug builds
//
// Prerequisites: Emscripten SDK active in shell (emcmake / cmake in PATH).
//
// Produces:
//   lib-wasm/libdggrid.js   + lib-wasm/libdggrid.wasm       (JS/browser)
//   lib-wasm-py/libdggrid.js + lib-wasm-py/libdggrid.wasm   (standalone)

import { spawnSync } from 'child_process';
import fs from 'fs';
import process from 'process';

// ── Helpers ────────────────────────────────────────────────────────────────

const getArgs = () =>
  process.argv.reduce((acc, arg) => {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      acc[key] = val ?? true;
    } else if (arg.startsWith('-')) {
      arg.slice(1).split('').forEach((f) => (acc[f] = true));
    }
    return acc;
  }, {});

/** Run a command synchronously; exit on failure. */
const run = (cmd, args) => {
  const display = `${cmd} ${args.join(' ')}`;
  console.log(`\n> ${display}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.error) {
    console.error(`Failed to start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Command exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
};

// ── Build function ─────────────────────────────────────────────────────────

/**
 * Configure and build one WASM target.
 *
 * @param {string}  outDir      - Output directory (cmake build dir + output)
 * @param {boolean} standalone  - Enable -sSTANDALONE_WASM (Python wrapper)
 * @param {boolean} debug       - Use Debug build type
 */
const buildWasm = (outDir, standalone, debug) => {
  const buildType = debug ? 'Debug' : 'Release';

  // Clean previous build so stale artefacts never linger.
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });

  // ── Configure ──────────────────────────────────────────────────────────
  // emcmake injects the Emscripten toolchain into cmake.
  run('emcmake', [
    'cmake',
    '-S', '.',          // source root (contains CMakeLists.txt)
    '-B', outDir,       // build + output directory
    `-DSTANDALONE_WASM=${standalone ? 'ON' : 'OFF'}`,
    `-DCMAKE_BUILD_TYPE=${buildType}`,
  ]);

  // ── Build ──────────────────────────────────────────────────────────────
  run('cmake', ['--build', outDir, '--config', buildType]);
};

// ── Entry point ────────────────────────────────────────────────────────────

const { debug } = getArgs();

buildWasm('./lib-wasm',    false, !!debug);   // JS / browser target
buildWasm('./lib-wasm-py', true,  !!debug);   // standalone WASM target
