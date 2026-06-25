import analyzeGeneralJS from "./general/javascript.js";
import analyzeGeneralPy from "./general/python.js";
import analyzeGeneralCS from "./general/csharp.js";

export default function generalTreeAnalyzer(tree, sourceCode, fileExtension) {
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
