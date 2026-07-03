import fs from "fs";
import path from "path";
import { boxError, boxSuccess, box } from "../ui/box.js";
import {
  VALID_FILE_EXTENSIONS,
  ARCHONE_DIR,
  CONSOLE_MAX_WIDTH,
  AVAILABLE_ANALYSIS_MODES,
} from "../constants.js";
import clack from "../lib/clack.js";
import {
  selectFileFromDirectory,
  sortIssuesBySeverity,
} from "../utils/helpers.js";
import { withIssuePrinciple } from "../utils/issue-principles.js";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";

import treeParser from "../parser/analysis-parser.js";
import formatAnalysisResult from "../formatter/analysisFormatter.js";

import generalTreeAnalyzer from "../analyzer/generalTreeAnalyzer.js";
import oopTreeAnalyzer from "../analyzer/oopTreeAnalyzer.js";
import { setLatestAnalysis } from "../lib/local.js";

export default async () => {
  const providedInputPath = process.argv[3] || null;

  const hasModeFlag =
    process.argv[4] && process.argv[4].toLowerCase() === "--mode";

  let mode = hasModeFlag
    ? process.argv[5]
      ? process.argv[5].toLowerCase()
      : "general"
    : "general";

  let completeFilePath = providedInputPath
    ? path.join(process.cwd(), providedInputPath)
    : await selectFileFromDirectory(process.cwd());

  if (!completeFilePath) {
    process.exit(0);
  }

  if (!fs.existsSync(completeFilePath)) {
    boxError(
      "Oops! The file you provided does not exist. Please check the file path and try again.",
    );
    process.exit(0);
  }

  const stat = fs.lstatSync(completeFilePath);

  if (stat.isDirectory()) {
    completeFilePath = await selectFileFromDirectory(completeFilePath);
  }

  if (stat.isSymbolicLink()) {
    boxError(
      "Oops! The path you provided is a symbolic link. Please provide a valid file path to analyze.",
    );

    process.exit(0);
  }

  const fileExtension = path.extname(completeFilePath).slice(1).toLowerCase();

  if (!VALID_FILE_EXTENSIONS.includes(fileExtension)) {
    boxError(
      "Oops! The file you provided is not supported for analysis. Please provide a valid file with one of the following extensions: " +
        VALID_FILE_EXTENSIONS.join(", ") +
        ".",
    );
    process.exit(0);
  }

  const shouldPromptForMode = !providedInputPath && !hasModeFlag;
  if (shouldPromptForMode) {
    const selectedMode = await clack.select({
      message: "Choose analysis mode",
      options: [
        {
          value: "general",
          label: "General",
          hint: "General code issues (functions, variables, complexity, etc.)",
        },
        {
          value: "oop",
          label: "OOP",
          hint: "OOP smells (constructor, dependencies, responsibilities, etc.)",
        },
      ],
    });

    if (clack.isCancel(selectedMode)) {
      process.exit(0);
    }

    mode = String(selectedMode).toLowerCase();
  }

  if (!AVAILABLE_ANALYSIS_MODES.includes(mode)) {
    boxError(
      `Invalid mode specified. Available modes are: ${AVAILABLE_ANALYSIS_MODES.join(
        ", ",
      )}. Please provide a valid mode using the --mode flag.`,
    );
    process.exit(0);
  }

  const fileToAnalyze = path.relative(process.cwd(), completeFilePath);
  const sourceCode = fs.readFileSync(completeFilePath, "utf-8") || "";

  const isEmptyFile = sourceCode.trim().length === 0;
  const hasExecutableCode = hasExecutableCodeByLanguage(
    sourceCode,
    fileExtension,
  );
  const isCommentOnlyFile = !isEmptyFile && !hasExecutableCode;
  const isValid = !isEmptyFile && !isCommentOnlyFile;

  if (!isValid) {
    boxError(
      isEmptyFile
        ? "This file is empty and cannot be analyzed. Add code to the file and run analysis again."
        : "This file is full of comments. Add a valid code block (for example, declarations, functions, or executable statements) and run analysis again.",
    );
    process.exit(0);
  }

  const analyzer = getAnalyzerMode(mode);
  const tree = await treeParser(sourceCode, fileExtension);
  const result = isValid
    ? analyzer(tree, sourceCode, fileExtension)
    : {
        functions: [],
        variables: [],
        comments: [],
        issues: [],
        isEmptyFile: true,
        isCommentOnlyFile,
      };

  const issuesWithPrinciples = (result.issues || []).map(withIssuePrinciple);
  const sortedIssues = sortIssuesBySeverity(issuesWithPrinciples);
  result.issues = sortedIssues;

  const code = fs.readFileSync(
    path.join(process.cwd(), fileToAnalyze),
    "utf-8",
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

  setLatestAnalysis(fileToAnalyze, result);

  await checkAuth();
  await saveToDatabase(fileToAnalyze, fileExtension, code, result);
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

async function checkAuth() {
  const { userId } = await getSession();

  if (!userId) {
    box(
      "You are not logged in. Log in to save your analysis results and access personalized insights.",
      "Login Required",
    );
    process.exit(0);
  }
}

async function saveToDatabase(fileToAnalyze, fileExtension, code, result) {
  const spinner = clack.spinner();
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
      spinner.stop("Analysis Finished.\n");
      boxError(
        "The code on the selected file is short, so the analysis result will not be saved.",
      );
      process.exit(0);
    }
  }
  spinner.stop("Analysis Result Saved!\n");
}

function getAnalyzerMode(mode) {
  switch (mode) {
    case "general":
      return generalTreeAnalyzer;
      break;
    case "oop":
      return oopTreeAnalyzer;
      break;
    default:
      return generalTreeAnalyzer;
  }
}
