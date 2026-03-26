import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";

export default (sourceCode) => {
  const parser = new Parser();
  parser.setLanguage(JavaScript);
  return parser.parse(sourceCode);
};
