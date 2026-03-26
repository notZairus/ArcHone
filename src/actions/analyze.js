import fs from "fs";
import path from "path";

import { boxError } from "../ui/box.js";
import analyzeJavaScript from "../analyzer/javascript.js";
import analyzePython from "../analyzer/python.js";
import analyzeCSharp from "../analyzer/csharp.js";
import { VALID_FILE_EXTENSIONS, ARCHONE_DIR } from "../constants.js";
import formatAnalysisResult from "../formatter/analysisFormatter.js";
import boxen from "boxen";
import clack from "../lib/clack.js";
import {
  selectFileFromDirectory,
  sortIssuesBySeverity,
} from "../utils/helpers.js";

export default async () => {
  const providedInputPath = process.argv[3] || null;
  let completeFilePath = providedInputPath
    ? path.join(process.cwd(), providedInputPath)
    : null;

  if (!providedInputPath) {
    completeFilePath = await selectFileFromDirectory(process.cwd());
  }

  if (!completeFilePath) {
    clack.outro("Analysis canceled.");
    return;
  }

  if (!fs.existsSync(completeFilePath)) {
    boxError(
      "Oops! The file you provided does not exist. Please check the file path and try again.",
    );
    return;
  }

  const stat = fs.lstatSync(completeFilePath);

  if (stat.isSymbolicLink()) {
    boxError(
      "Oops! The path you provided is a symbolic link. Please provide a valid file path to analyze.",
    );
    return;
  }

  if (stat.isDirectory()) {
    completeFilePath = await selectFileFromDirectory(completeFilePath);

    if (!completeFilePath) {
      clack.cancel("Analysis canceled.");
      return;
    }
  }

  const fileToAnalyze = path.relative(process.cwd(), completeFilePath);
  const fileExtension = path.extname(completeFilePath).slice(1).toLowerCase();

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
      result = analyzeJavaScript(sourceCode, fileExtension);
      break;
    case "py":
      result = analyzePython(sourceCode, fileExtension);
      break;
    case "cs":
      result = analyzeCSharp(sourceCode, fileExtension);
      break;
    default:
      boxError(`Parsing for .${fileExtension} is not implemented yet.`);
      return;
  }

  const sortedIssues = sortIssuesBySeverity(result.issues || []);
  result.issues = sortedIssues;

  // await Database.saveAnalysisResult(fileToAnalyze, fileExtension, result);

  // save the latest analysis result to a JSON file for future reference
  const analysisResultPath = path.join(ARCHONE_DIR, "latest_analysis.json");

  fs.writeFileSync(
    analysisResultPath,
    JSON.stringify(
      { file: path.join(process.cwd(), fileToAnalyze), result },
      null,
      2,
    ),
  );

  console.log(
    "\n" +
      boxen(formatAnalysisResult(fileToAnalyze, result), {
        padding: 1,
        borderStyle: "double",
        title: "ArcHone Analysis Result",
        titleAlignment: "center",
      }),
  );
};
