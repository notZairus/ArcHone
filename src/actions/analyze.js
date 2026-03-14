import fs from "fs";
import { boxError, boxSuccess } from "../ui/box.js";
import jsParser from "../parser/js-parser.js";
import analyzeJavaScriptTree from "../analyzer/js-analyzer.js";
import formatAnalysisReport from "../formatter/js-formatter.js";
import { VALID_FILE_EXTENSIONS } from "../constants.js";

export default () => {
  const fileToAnalyze = process.argv[3] || null;
  const completeFilePath = process.cwd() + "/" + fileToAnalyze;

  if (!fileToAnalyze) {
    boxError(
      "Please provide a file to analyze using the command: archone analyze <file-path>",
    );
    return;
  }

  if (!fs.existsSync(completeFilePath)) {
    boxError(
      "Oops! The file you provided does not exist. Please check the file path and try again.",
    );
    return;
  }

  const stat = fs.statSync(completeFilePath, { withFileType: true });

  if (stat.isDirectory() || stat.isSymbolicLink()) {
    boxError(
      "Oops! The path you provided is a directory. Please provide a valid file path to analyze.",
    );
    return;
  }

  const fileExtension = fileToAnalyze.split(".").pop();

  if (!VALID_FILE_EXTENSIONS.includes(fileExtension)) {
    boxError(
      "Oops! The file you provided is not supported for analysis. Please provide a valid file with one of the following extensions: " +
        VALID_FILE_EXTENSIONS.join(", ") +
        ".",
    );
    return;
  }

  const sourceCode = fs.readFileSync(completeFilePath, "utf-8") || "";

  let output = null;

  switch (fileExtension) {
    case "js":
      const tree = jsParser(sourceCode);
      const result = analyzeJavaScriptTree(tree, sourceCode);
      output = formatAnalysisReport(fileToAnalyze, result);
      break;
    default:
      boxError(
        `Parsing for .${fileExtension} is not implemented yet. Use a JavaScript file for now.`,
      );
      break;
  }

  boxSuccess(output);
};
