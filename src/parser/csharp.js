import Parser from "tree-sitter";
import CSharp from "tree-sitter-c-sharp";

export default (sourceCode) => {
  const parser = new Parser();
  parser.setLanguage(CSharp);
  return parser.parse(sourceCode);
};
