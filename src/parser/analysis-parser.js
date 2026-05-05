import { Parser, Language } from "web-tree-sitter";
import { fileURLToPath } from "url";

const wasmPaths = {
  js: fileURLToPath(
    new URL("../wasm/tree-sitter-javascript.wasm", import.meta.url),
  ),
  py: fileURLToPath(
    new URL("../wasm/tree-sitter-python.wasm", import.meta.url),
  ),
  cs: fileURLToPath(
    new URL("../wasm/tree-sitter-c_sharp.wasm", import.meta.url),
  ),
};

let parsers = {};

export default async function treeParser(sourceCode, language) {
  await Parser.init();

  if (!parsers[language]) {
    const wasmPath = wasmPaths[language];
    const languageModule = await Language.load(wasmPath);

    const parser = new Parser();
    parser.setLanguage(languageModule);

    parsers[language] = parser;
  }

  const parsed = parsers[language].parse(sourceCode);

  return parsed;
}
