import Parser from "tree-sitter";
import CSharp from "tree-sitter-c-sharp";
import Javascript from "tree-sitter-javascript";
import Python from "tree-sitter-python";

export default (sourceCode, language) => {
  const parser = new Parser();
  if (language === "js") {
    parser.setLanguage(Javascript);
    return parser.parse(sourceCode);
  } else if (language === "cs") {
    parser.setLanguage(CSharp);
    return parser.parse(sourceCode);
  } else if (language === "py") {
    parser.setLanguage(Python);
    return parser.parse(sourceCode);
  }
};
