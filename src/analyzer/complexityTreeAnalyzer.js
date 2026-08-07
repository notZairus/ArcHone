import analyzeComplexityJS from "./complexity/javascript.js";
import analyzeComplexityPy from "./complexity/python.js";
import analyzeComplexityCS from "./complexity/csharp.js";

export default function complexityTreeAnalyzer(
  tree,
  sourceCode,
  fileExtension,
) {
  if (!tree || typeof tree !== "object") {
    return {
      error: "Invalid syntax tree.",
    };
  }

  if (fileExtension === "js") {
    return analyzeComplexityJS(tree, sourceCode);
  } else if (fileExtension === "py") {
    return analyzeComplexityPy(tree, sourceCode);
  } else if (fileExtension === "cs") {
    return analyzeComplexityCS(tree, sourceCode);
  } else {
    return {
      error: `Unsupported file extension: ${fileExtension}`,
    };
  }
}
