// A simple js script to create a emss command
// https://www.ninkovic.dev/blog/2022/an-improved-guide-for-compiling-wasm-with-emscripten-and-embind


import { glob } from 'glob'
import fs from 'fs'
import { spawn } from 'child_process'

const targetDir = './dist';
const srcFiles = await glob('src/*.c*');
const target = `-o ${targetDir}/webdggrid.html --shell-file custom_shell.html`;

const CFLAGS = '-I src';
const JSFLAGS = `-lembind -O1 -s EXPORT_NAME=WEBDGGRID -s EXPORT_ES6=1 -s MODULARIZE=1 -s WASM=1 -s WASM_BIGINT=1  -sEXPORTED_FUNCTIONS=_main -sEXPORTED_RUNTIME_METHODS=ccall,cwrap -s ALLOW_MEMORY_GROWTH=1 -s BINARYEN_ASYNC_COMPILATION=0 `;
const DEBUGFLAGS = `-g4 --source-map-base`; //"http://localhost:8080/path/to/location/with/wasm/sourcemap/"

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}

fs.mkdirSync(targetDir);

const child = spawn('emsdk_env.bat && emcc', [JSFLAGS, srcFiles.join(' '), CFLAGS, target],{shell: true});

child.stdout.on('data', (data) => {
  console.log(`stdout:\n${data}`)
})

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`)
})

child.on('error', (error) => {
  console.error(`error: ${error.message}`)
})

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`)
})
// $(TARGET): $(OBJECTS)
// 	$(CC) $(CFLAGS) $(LDFLAGS) $(JSFLAGS) -o $@ $(SRC)
// 	# emmake complains about `.` characters in the `EXPORT_NAME`, so we add them manually...
// 	# sed -i 's/AudioWorkletGlobalScope_WAM_DX7/AudioWorkletGlobalScope\.WAM\.DX7/g' $(TARGET)
// 	# node encode-wasm.js dx7.wasm

// dist:
// 	cp webdggrid.js ../dist/wasm/
// 	cp webdggrid.wasm.js ../dist/wasm/
