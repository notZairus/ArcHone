import fs from "fs";
import path from "path";
import {
  VALID_FILE_EXTENSIONS,
  AVAILABLE_ANALYSIS_MODES,
} from "../constants.js";
import {
  selectFileFromDirectory,
  selectAnalysisMode,
  sortIssuesBySeverity,
  showNotification,
  refreshScreen,
  removeDuplicatedIssues,
  backToMenu,
} from "../utils/helpers.js";

import { withIssuePrinciple } from "../utils/issue-principles.js";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";

import treeParser from "../parser/analysis-parser.js";

import generalTreeAnalyzer from "../analyzer/generalTreeAnalyzer.js";
import oopTreeAnalyzer from "../analyzer/oopTreeAnalyzer.js";
import complexityTreeAnalyzer from "../analyzer/complexityTreeAnalyzer.js";
import { setLatestAnalysis } from "../lib/local.js";
import displayAnalysisResult from "../renders/generalOopResult.js";
import displayComplexityResult from "../renders/complexityResult.js";

export default async function analyze({
  screen,
  hasActionByDefault = true,
  currentFilePath = null,
  currentMode = null,
  fromScan = false,
}) {
  const providedInputPath = currentFilePath || process.argv[3];

  const hasModeFlag =
    process.argv[4] && process.argv[4].toLowerCase() === "--mode";

  let mode = currentMode
    ? currentMode
    : hasModeFlag
      ? process.argv[5]
        ? process.argv[5].toLowerCase()
        : "general"
      : "general";

  let completeFilePath = providedInputPath
    ? path.join(process.cwd(), providedInputPath)
    : await selectFileFromDirectory({
        directory: process.cwd(),
        screen,
        hasActionByDefault,
      });

  if (!completeFilePath) {
    backToMenu(hasActionByDefault);
    return;
  }

  if (!fs.existsSync(completeFilePath)) {
    refreshScreen(screen);
    await showNotification({
      screen,
      message:
        "The file you provided does not exist. Please provide a valid file path.",
    });

    backToMenu(hasActionByDefault);
    return;
  }

  const stat = await fs.lstatSync(completeFilePath);

  if (stat.isDirectory()) {
    completeFilePath = await selectFileFromDirectory({
      directory: completeFilePath,
      screen,
    });
  }

  if (stat.isSymbolicLink()) {
    refreshScreen(screen);
    await showNotification({
      screen,
      message:
        "Oops! The path you provided is a symbolic link. Please provide a valid file path to analyze.",
      duration: 3000,
    });

    backToMenu(hasActionByDefault);
    return;
  }

  const fileExtension = path.extname(completeFilePath).slice(1).toLowerCase();

  if (!VALID_FILE_EXTENSIONS.includes(fileExtension)) {
    refreshScreen(screen);
    await showNotification({
      screen,
      message:
        "Oops! The file you provided is not supported for analysis. Please provide a valid file with one of the following extensions: " +
        VALID_FILE_EXTENSIONS.join(", ") +
        ".",
      duration: 3000,
    });

    if (hasActionByDefault) {
      process.exit(0);
    }

    await analyze({ screen, hasActionByDefault, fromScan });
    return;
  }

  const shouldPromptForMode = !providedInputPath && !hasModeFlag;

  if (shouldPromptForMode) {
    const selectedMode = await selectAnalysisMode({
      screen,
      hasActionByDefault,
    });

    if (!selectedMode) {
      backToMenu(hasActionByDefault);
      return;
    }

    mode = selectedMode;
  }

  if (!AVAILABLE_ANALYSIS_MODES.includes(mode)) {
    await showNotification({
      screen,
      message: `Invalid mode specified. Available modes are: ${AVAILABLE_ANALYSIS_MODES.join(
        ", ",
      )}. Please provide a valid mode using the --mode flag.`,
      duration: 3000,
    });
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
    refreshScreen(screen);
    await showNotification({
      screen,
      message: isEmptyFile
        ? "This file is empty and cannot be analyzed. Add code to the file and run analysis again."
        : "This file is full of comments. Add a valid code block (for example, declarations, functions, or executable statements) and run analysis again.",
      duration: 3000,
    });

    if (hasActionByDefault) {
      process.exit(0);
    }

    await analyze({ screen, hasActionByDefault, fromScan });
    return;
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
  const cleanIssues = removeDuplicatedIssues(
    sortIssuesBySeverity(issuesWithPrinciples),
  );
  const code = fs.readFileSync(
    path.join(process.cwd(), fileToAnalyze),
    "utf-8",
  );

  result.issues = cleanIssues;
  result.mode = mode;
  result.language = fileExtension;
  result.code = code;
  result.fileToAnalyze = fileToAnalyze;

  const { userId } = await getSession();

  if (result.mode === "complexity") {
    await displayComplexityResult({
      screen,
      hasActionByDefault,
      result,
      fromScan,
    });
  } else {
    await displayAnalysisResult({
      screen,
      hasActionByDefault,
      result,
      fromScan,
    });
  }

  if (userId) {
    await saveToDatabase({
      fileToAnalyze,
      fileExtension,
      code,
      result,
      mode,
    });
  }

  await setLatestAnalysis(fileToAnalyze, result);
}

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

async function saveToDatabase({
  fileToAnalyze,
  fileExtension,
  code,
  result,
  mode,
}) {
  try {
    if (mode === "complexity") {
      await Database.saveComplexityAnalysisResult({
        fileName: fileToAnalyze,
        fileType: fileExtension,
        code,
        complexityResult: result,
      });
    } else {
      await Database.saveAnalysisResult(
        fileToAnalyze,
        fileExtension,
        code,
        result,
      );
    }
  } catch (error) {}
}

function getAnalyzerMode(mode) {
  switch (mode) {
    case "general":
      return generalTreeAnalyzer;
      break;
    case "complexity":
      return complexityTreeAnalyzer;
      break;
    case "oop":
      return oopTreeAnalyzer;
      break;
    default:
      return generalTreeAnalyzer;
  }
}
