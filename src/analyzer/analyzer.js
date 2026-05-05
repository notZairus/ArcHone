import analyzeGeneralJS from "../analyzer/general/javascript.js";
import analyzeGeneralPy from "../analyzer/general/python.js";
import analyzeGeneralCS from "../analyzer/general/csharp.js";

export default function treeAnalyzer(tree, sourceCode, fileExtension) {
  if (!tree || typeof tree !== "object") {
    return {
      error: "Invalid syntax tree.",
    };
  }

  if (fileExtension === "js") {
    return analyzeGeneralJS(tree, sourceCode);
  } else if (fileExtension === "py") {
    return analyzeGeneralPy(tree, sourceCode);
  } else if (fileExtension === "cs") {
    return analyzeGeneralCS(tree, sourceCode);
  } else {
    return {
      error: `Unsupported file extension: ${fileExtension}`,
    };
  }
}
