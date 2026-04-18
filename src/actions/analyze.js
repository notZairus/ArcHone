import fs from "fs";
import path from "path";

import { boxError, boxSuccess } from "../ui/box.js";
import analyzeJavaScript from "../analyzer/javascript.js";
import analyzePython from "../analyzer/python.js";
import analyzeCSharp from "../analyzer/csharp.js";
import {
  VALID_FILE_EXTENSIONS,
  ARCHONE_DIR,
  CONSOLE_MAX_WIDTH,
} from "../constants.js";
import formatAnalysisResult from "../formatter/analysisFormatter.js";
import boxen from "boxen";
import clack from "../lib/clack.js";
import {
  isInitialized,
  selectFileFromDirectory,
  sortIssuesBySeverity,
} from "../utils/helpers.js";
import { withIssuePrinciple } from "../utils/issue-principles.js";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";

const spinner = clack.spinner();

export default async () => {
  console.clear();

  if (!isInitialized()) {
    return;
  }

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
  const isEmptyFile = sourceCode.trim().length === 0;
  const hasExecutableCode = hasExecutableCodeByLanguage(
    sourceCode,
    fileExtension,
  );
  const isCommentOnlyFile = !isEmptyFile && !hasExecutableCode;

  let result = null;
  if (isEmptyFile || isCommentOnlyFile) {
    result = {
      functions: [],
      variables: [],
      comments: [],
      issues: [],
      isEmptyFile: true,
      isCommentOnlyFile,
    };
  } else {
    switch (fileExtension) {
      case "js":
        result = await analyzeJavaScript(sourceCode, fileExtension);
        break;
      case "py":
        result = await analyzePython(sourceCode, fileExtension);
        break;
      case "cs":
        result = await analyzeCSharp(sourceCode, fileExtension);
        break;
      default:
        boxError(`Parsing for .${fileExtension} is not implemented yet.`);
        return;
    }
  }

  const issuesWithPrinciples = (result.issues || []).map(withIssuePrinciple);
  const sortedIssues = sortIssuesBySeverity(issuesWithPrinciples);
  result.issues = sortedIssues;

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

  console.clear();
  console.log(
    boxen(formatAnalysisResult(fileToAnalyze, result), {
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "ArcHone Analysis Result",
      titleAlignment: "center",
    }),
  );

  console.log(
    boxen(
      "Use archone explain <issue_id> for more information about the specific issue.",
      {
        padding: 1,
        width: CONSOLE_MAX_WIDTH,
        textAlignment: "center",
        borderStyle: "double",
        title: "Tips",
        titleAlignment: "center",
      },
    ),
  );

  const { userId } = await getSession();

  if (!userId) {
    console.log("\n");
    console.log(
      boxen(
        "You are not logged in. Log in to save your analysis results and access personalized insights.",
        {
          padding: 1,
          width: CONSOLE_MAX_WIDTH,
          textAlignment: "center",
          borderStyle: "double",
          title: "Login Required",
          titleAlignment: "center",
        },
      ),
    );
    console.log("\n");
    return;
  }

  const code = fs.readFileSync(
    path.join(process.cwd(), fileToAnalyze),
    "utf-8",
  );

  spinner.start("Saving Analysis Result...");
  try {
    await Database.saveAnalysisResult(
      fileToAnalyze,
      fileExtension,
      code,
      result,
    );
  } catch (error) {
    if (code.length < 100) {
      spinner.stop("Analysis Finished.");
      boxSuccess(
        "The code on the selected file is rather short, so the analysis result will not be saved.",
      );
      return;
    }
  }

  spinner.stop("Analysis Result Saved!");
  console.log("\n");
};

const hasExecutableCodeByLanguage = (sourceCode, fileExtension) => {
  if (!sourceCode || typeof sourceCode !== "string") {
    return false;
  }

  let withoutComments = sourceCode;

  if (fileExtension === "py") {
    withoutComments = withoutComments.replace(/^\s*#.*$/gm, "");
  } else {
    withoutComments = withoutComments
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  }

  return withoutComments.trim().length > 0;
};
