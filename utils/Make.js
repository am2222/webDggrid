// A simple js script to create a emss command
// https://www.ninkovic.dev/blog/2022/an-improved-guide-for-compiling-wasm-with-emscripten-and-embind

import { glob } from 'glob';
import fs from 'fs';
import { spawn } from 'child_process';
import process from 'process';

const getArgs = () =>
  process.argv.reduce((args, arg) => {
    // long arg
    if (arg.slice(0, 2) === '--') {
      const longArg = arg.split('=');
      const longArgFlag = longArg[0].slice(2);
      const longArgValue = longArg.length > 1 ? longArg[1] : true;
      args[longArgFlag] = longArgValue;
    }
    // flags
    else if (arg[0] === '-') {
      const flags = arg.slice(1).split('');
      flags.forEach((flag) => {
        args[flag] = true;
      });
    }
    return args;
  }, {});

const runCMD = (
  targetDir,
  srcFiles,
  libName = 'libdggrid',
  standAloneWasm = true,
  debug = false
) => {
  const target = [`-o ${targetDir}/${libName}.html`];

  // ── Include paths ────────────────────────────────────────────────────────
  // Paths are relative to the project root (where emcc is invoked).
  //
  //   submodules/DGGRID/src/lib/dglib/include
  //       provides  <dglib/Dg*.h>
  //   submodules/DGGRID/src/lib/proj4lib/include
  //       provides  "proj4.h"  (included by DgProjGnomonicRF.cpp)
  //   submodules/DGGRID/src/lib/shapelib/include/shapelib
  //       provides  <shapefil.h>  (included by DgInShapefile.h etc.)
  //   copy_to_src
  //       provides  "dggrid_transform.hpp"
  const CFLAGS = [
    '-I submodules/DGGRID/src/lib/dglib/include',
    '-I submodules/DGGRID/src/lib/proj4lib/include',
    '-I submodules/DGGRID/src/lib/shapelib/include/shapelib',
    '-I copy_to_src',
  ];

  const JSFLAGS = [
    '-lembind',
    `-sEXPORT_NAME=${libName}`,
    '-sEXPORTED_FUNCTIONS=_main',
    '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap',
    '-sASSERTIONS=0',
    '-sINVOKE_RUN=0',
    '-sALLOW_MEMORY_GROWTH=1',
    '-sWASM=1',
    '-sENVIRONMENT=webview',
    '-sFILESYSTEM=0',
    '-sMINIMAL_RUNTIME=0',
    '-sMODULARIZE=1',
    '-sEXPORT_ES6=1',
    '-sIGNORE_CLOSURE_COMPILER_ERRORS=0',
    '-sWASM_BIGINT=1',

    '-sBINARYEN_ASYNC_COMPILATION=1',
    '-sDYNAMIC_EXECUTION=0',
  ];

  if (standAloneWasm) {
    JSFLAGS.push('-sSTANDALONE_WASM=1');
  }

  if (debug) {
    JSFLAGS.push(
      ...[
        '-sUSE_ES6_IMPORT_META=1',
        '-gsource-map',
        '--source-map-base ./',
        '-O1',
      ]
    );
    //Debugging c++ only works in browser with "Experimental DWARF support turned on"
  } else {
    JSFLAGS.push(...['-sUSE_ES6_IMPORT_META=0', '-O3']);
    target.push(...['--shell-file ./copy_to_src/custom_shell.html']);
  }

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }
  fs.mkdirSync(targetDir);

  const cmdArgs = [...JSFLAGS, ...srcFiles, ...CFLAGS, ...target];
  console.log(cmdArgs.join(' '));

  const cp = spawn('emcc', cmdArgs, { shell: true });
  cp.on('error', (ex) => {
    console.log(`stdout:\n${ex}`);
  });
  cp.on('close', (code) => {
    console.log(`stdout:\n${code}`);
  });
  cp.stdout.on('data', (data) => {
    console.log(`stdout:\n${data}`);
  });

  cp.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
};

const args = getArgs();

const debug = args['debug'] || false;

// ── Source files ─────────────────────────────────────────────────────────
// Collect all .cpp/.c sources from the DGGRID v8 submodule libraries plus
// the wrapper and binding files from copy_to_src/.
const dgglibSrc   = await glob('./submodules/DGGRID/src/lib/dglib/lib/*.cpp');
const proj4Src    = await glob('./submodules/DGGRID/src/lib/proj4lib/lib/*.cpp');
const shapelibSrc = await glob('./submodules/DGGRID/src/lib/shapelib/lib/*.c');

const srcFiles = [
  ...dgglibSrc,
  ...proj4Src,
  ...shapelibSrc,
  './copy_to_src/dggrid_transform.cpp',
  './copy_to_src/webdggrid.cpp',
];

// build for js env
runCMD('./lib-wasm', srcFiles, 'libdggrid', false, false);
runCMD('./lib-wasm-py', srcFiles, 'libdggrid', true, false);
