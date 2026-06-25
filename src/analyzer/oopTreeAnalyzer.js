import analyzeOopJS from "./oop/javascript.js";
import analyzeOopPy from "./oop/python.js";
import analyzeOopCS from "./oop/csharp.js";

export default function oopTreeAnalyzer(tree, sourceCode, fileExtension) {
  if (!tree || typeof tree !== "object") {
    return {
      error: "Invalid syntax tree.",
    };
  }

  if (fileExtension === "js") {
    return analyzeOopJS(tree, sourceCode);
  } else if (fileExtension === "py") {
    return analyzeOopPy(tree, sourceCode);
  } else if (fileExtension === "cs") {
    return analyzeOopCS(tree, sourceCode);
  } else {
    return {
      error: `Unsupported file extension: ${fileExtension}`,
    };
  }
}
