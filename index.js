// Assume add.wasm file exists that contains a single function adding 2 provided arguments
const fs = require('fs');

const wasmBuffer = fs.readFileSync('aa.wasm');
WebAssembly.instantiate(wasmBuffer).then(wasmModule => {
  // Exported function live under instance.exports
  const { add } = wasmModule.instance.exports;
  const sum = add(5, 6);
  console.log(sum); // Outputs: 11
});