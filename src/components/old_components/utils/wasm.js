const wasmUrl = 'https://inference.wasmlabs.dev/llama2-c.wasm';
const modelUrl = 'https://huggingface.co/karpathy/tinyllamas/resolve/main/stories260K/stories260K.bin';
const tokenizerUrl = 'https://huggingface.co/karpathy/tinyllamas/resolve/main/stories260K/tok512.bin';

async function fetchAndInstantiate(url, importObject) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const obj = await WebAssembly.instantiate(buffer, importObject);
  return obj.instance;
}

async function loadModelAndTokenizer(modelUrl, tokenizerUrl) {
  const responses = await Promise.all([fetch(modelUrl), fetch(tokenizerUrl)]);
  const buffers = await Promise.all(responses.map(res => res.arrayBuffer()));
  return buffers;
}

export async function initWasm() {
  const [modelBuffer, tokenizerBuffer] = await loadModelAndTokenizer(modelUrl, tokenizerUrl);
  const wasmInstance = await fetchAndInstantiate(wasmUrl);

  // Assuming the WASM module has methods to set model and tokenizer
  wasmInstance.exports.setModel(new Uint8Array(modelBuffer));
  wasmInstance.exports.setTokenizer(new Uint8Array(tokenizerBuffer));

  return wasmInstance.exports;
}