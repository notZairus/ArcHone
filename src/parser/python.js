import Parser from "tree-sitter";
import Python from "tree-sitter-python";

export default (sourceCode) => {
  const parser = new Parser();
  parser.setLanguage(Python);
  return parser.parse(sourceCode);
};
