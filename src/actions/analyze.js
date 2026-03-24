import fs from "fs";

import { boxError, boxSuccess } from "../ui/box.js";
import analyzeJavaScript from "../analyzer/javascript.js";
import analyzePython from "../analyzer/python.js";
import { VALID_FILE_EXTENSIONS } from "../constants.js";
import formatAnalysisResult from "../formatter/js-formatter.js";
import Database from "../lib/db.js";

export default async () => {
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

  let result = null;
  switch (fileExtension) {
    case "js":
      result = analyzeJavaScript(sourceCode);
      break;
    case "py":
      result = analyzePython(sourceCode);
      break;
    default:
      boxError(
        `Parsing for .${fileExtension} is not implemented yet. Use a JavaScript file for now.`,
      );
      break;
  }

  await Database.saveAnalysisResult(fileToAnalyze, fileExtension, result);

  boxSuccess(formatAnalysisResult(fileToAnalyze, result));
};
