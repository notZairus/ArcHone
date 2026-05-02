import fs from "fs";
import path from "path";

import { boxError, boxSuccess, box } from "../ui/box.js";
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
  const providedInputPath = process.argv[3] || null;
  const completeFilePath = providedInputPath
    ? path.join(process.cwd(), providedInputPath)
    : await selectFileFromDirectory(process.cwd());

  if (!fs.existsSync(completeFilePath)) {
    boxError(
      "Oops! The file you provided does not exist. Please check the file path and try again.",
    );
    return;
  }

  const stat = fs.lstatSync(completeFilePath);

  if (stat.isDirectory()) {
    completeFilePath = await selectFileFromDirectory(completeFilePath);
  }

  if (stat.isSymbolicLink()) {
    boxError(
      "Oops! The path you provided is a symbolic link. Please provide a valid file path to analyze.",
    );
    return;
  }

  const fileExtension = path.extname(completeFilePath).slice(1).toLowerCase();

  if (!VALID_FILE_EXTENSIONS.includes(fileExtension)) {
    boxError(
      "Oops! The file you provided is not supported for analysis. Please provide a valid file with one of the following extensions: " +
        VALID_FILE_EXTENSIONS.join(", ") +
        ".",
    );
    return;
  }

  const fileToAnalyze = path.relative(process.cwd(), completeFilePath);
  const sourceCode = fs.readFileSync(completeFilePath, "utf-8") || "";

  const isEmptyFile = sourceCode.trim().length === 0;
  const hasExecutableCode = hasExecutableCodeByLanguage(
    sourceCode,
    fileExtension,
  );
  const isCommentOnlyFile = !isEmptyFile && !hasExecutableCode;

  if (isEmptyFile) {
    boxError(
      "This file is empty and cannot be analyzed. Add code to the file and run analysis again.",
    );
    return;
  }

  if (!isCommentOnlyFile) {
    const hasMeaningfulCode = hasMinimumCodeSignal(sourceCode, fileExtension);

    if (!hasMeaningfulCode) {
      boxError(
        "This file has too little code to analyze. Add a valid code block (for example, declarations, functions, or executable statements) and run analysis again.",
      );
      return;
    }
  }

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
        result = await analyzeJavaScript(sourceCode);
        break;
      case "py":
        result = await analyzePython(sourceCode);
        break;
      case "cs":
        result = await analyzeCSharp(sourceCode);
        break;
      default:
        boxError(`Parsing for .${fileExtension} is not implemented yet.`);
        return;
    }
  }

  const issuesWithPrinciples = (result.issues || []).map(withIssuePrinciple);
  const sortedIssues = sortIssuesBySeverity(issuesWithPrinciples);
  result.issues = sortedIssues;

  const analysisResultPath = path.join(ARCHONE_DIR, "latest_analysis.json");

  fs.writeFileSync(
    analysisResultPath,
    JSON.stringify({ file: fileToAnalyze, result }, null, 2),
  );

  box(
    formatAnalysisResult(fileToAnalyze, result),
    `${fileToAnalyze} Analysis Result`,
    null,
    null,
    true,
  );

  box(
    "Use archone explain <issue_id> for more information about the specific issue.",
    "Tips",
  );

  const { userId } = await getSession();

  if (!userId) {
    console.log("\n");
    box(
      "You are not logged in. Log in to save your analysis results and access personalized insights.",
      "Login Required",
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
      boxError(
        "The code on the selected file is short, so the analysis result will not be saved.",
      );
      return;
    }
  }

  spinner.stop("Analysis Result Saved!");
};

// HELPERS //////////////////////////////////////////////////////////
// HELPERS //////////////////////////////////////////////////////////
// HELPERS //////////////////////////////////////////////////////////

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

const hasMinimumCodeSignal = (sourceCode, fileExtension) => {
  if (!sourceCode || typeof sourceCode !== "string") {
    return false;
  }

  let stripped = sourceCode;

  if (fileExtension === "py") {
    stripped = stripped.replace(/^\s*#.*$/gm, "");
  } else {
    stripped = stripped
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  }

  const compact = stripped.trim();
  if (!compact) {
    return false;
  }

  const minLengthByLanguage = {
    js: 5,
    cs: 5,
    py: 4,
  };

  if (compact.length < (minLengthByLanguage[fileExtension] || 5)) {
    return false;
  }

  const keywordPatternByLanguage = {
    js: /\b(function|class|const|let|var|if|for|while|return|import|export|new|async|await|try|catch|switch)\b/g,
    cs: /\b(class|namespace|using|public|private|protected|static|void|int|string|if|for|while|return|new|try|catch|switch)\b/g,
    py: /\b(def|class|import|from|if|for|while|return|with|try|except|lambda|yield)\b/g,
  };

  const identifierMatches =
    compact.match(/[A-Za-z_][A-Za-z0-9_]*/g)?.length || 0;
  const keywordMatches =
    compact.match(keywordPatternByLanguage[fileExtension] || /$^/g)?.length ||
    0;

  return identifierMatches >= 2 || keywordMatches >= 1;
};
