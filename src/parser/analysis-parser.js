import {Parser, Language} from "web-tree-sitter";

const getWasmPath = (language) => {
  const wasmPaths = {
    js: "src/wasm/tree-sitter-javascript.wasm",
    py: "src/wasm/tree-sitter-python.wasm",
    cs: "src/wasm/tree-sitter-c_sharp.wasm",
  };
  return wasmPaths[language]; 
};

let parsers = {};

export default async (sourceCode, language) => {
  await Parser.init();

  if (!parsers[language]) {
    const wasmPath = getWasmPath(language);
    const languageModule = await Language.load(wasmPath); 
    const parser = new Parser();
    parser.setLanguage(languageModule);
    parsers[language] = parser;
  }

  return parsers[language].parse(sourceCode);
};
