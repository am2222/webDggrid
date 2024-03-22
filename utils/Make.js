// A simple js script to create a emss command
// https://www.ninkovic.dev/blog/2022/an-improved-guide-for-compiling-wasm-with-emscripten-and-embind

import { glob } from 'glob';
import fs from 'fs';
import { spawn } from 'child_process';

const debug = false;
const targetDir = './lib-wasm';
const srcFiles = await glob('./src-cpp/*.c*');
const target = [
  `-o ${targetDir}/libdggrid.html`];

const CFLAGS = ['-I src-cpp'];
const JSFLAGS = [
  '-lembind',
  '-sEXPORT_NAME=libdggrid',
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
  '-sSTANDALONE_WASM=0',
  '-sBINARYEN_ASYNC_COMPILATION=1',
  '-sDYNAMIC_EXECUTION=0'];

if (debug) {
  JSFLAGS.push(...['-sUSE_ES6_IMPORT_META=1', '-gsource-map', '--source-map-base ./', '-O1']); 
  //Debugging c++ only works in browser with "Experimental DWARF support turned on"
}else{
  JSFLAGS.push(...['-sUSE_ES6_IMPORT_META=0', '-O3']);
  target.push(...['--shell-file ./copy_to_src/custom_shell.html']); 
}

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}

fs.mkdirSync(targetDir);

console.log([...JSFLAGS, ...srcFiles, ...CFLAGS, ...target].join(' '));

const cp = spawn('emsdk_env.sh && emcc', [...JSFLAGS, ...srcFiles, ...CFLAGS, ...target], { shell: true });
cp.on('error', ex => {console.log(`stdout:\n${ex}`);});
cp.on('close', code => {console.log(`stdout:\n${code}`);});
cp.stdout.on('data', (data) => {
  console.log(`stdout:\n${data}`);
});

cp.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});
