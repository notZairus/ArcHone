import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";

export default (sourceCode) => {
  const parser = new Parser();
  parser.setLanguage(JavaScript);
  return parser.parse(sourceCode);
};
