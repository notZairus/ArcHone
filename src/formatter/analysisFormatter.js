import chalk from "chalk";
import {
  BASE_ISSUE_PENALTIES,
  LANGUAGE_ISSUE_PENALTIES,
  DEFAULT_PENALTY_BY_TYPE,
  DEFAULT_FALLBACK_PENALTY,
  TYPE_DISPLAY_ORDER,
  LANGUAGE_BY_EXTENSION,
} from "../constants.js";
import { getViolatedPrinciple } from "../utils/issue-principles.js";

const getLanguageFromFileName = (fileName) => {
  if (!fileName || typeof fileName !== "string") {
    return "unknown";
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  return LANGUAGE_BY_EXTENSION[extension] || "unknown";
};

const getPenaltyByTitle = (language) => {
  const table = {};

  for (const issue of BASE_ISSUE_PENALTIES) {
    table[issue.title] = issue.penalty;
  }

  for (const issue of LANGUAGE_ISSUE_PENALTIES[language] || []) {
    table[issue.title] = issue.penalty;
  }

  return table;
};

const getIssuePenalty = (issue, basePenaltyByTitle) => {
  if (typeof issue.penalty === "number" && Number.isFinite(issue.penalty)) {
    return issue.penalty;
  }

  if (issue.title && basePenaltyByTitle[issue.title] != null) {
    return basePenaltyByTitle[issue.title];
  }

  if (issue.type && DEFAULT_PENALTY_BY_TYPE[issue.type] != null) {
    return DEFAULT_PENALTY_BY_TYPE[issue.type];
  }

  return DEFAULT_FALLBACK_PENALTY;
};

const formatLocation = (issue) => {
  if (typeof issue.line === "number" && Number.isFinite(issue.line)) {
    if (issue.title === "TODO Comment") {
      return `   Line: ${issue.line}`;
    }

    return `   Location: line ${issue.line}`;
  }

  return "   Location: unknown";
};

const formatAdvice = (issue) => {
  if (issue.suggestion) {
    return issue.suggestion;
  }

  return "Review this finding and apply the appropriate refactor.";
};

const getIssueTitle = (issue) => {
  return issue.title || "Other";
};

const getIssueType = (issue) => {
  return issue.type || "unknown";
};

const buildCountsByTitle = (issues) => {
  const countsByTitle = new Map();

  for (const issue of issues) {
    const title = getIssueTitle(issue);
    countsByTitle.set(title, (countsByTitle.get(title) || 0) + 1);
  }

  return countsByTitle;
};

const buildPenaltyByTitle = (issues, basePenaltyByTitle) => {
  const penaltyByTitle = new Map();

  for (const issue of issues) {
    const title = getIssueTitle(issue);
    if (penaltyByTitle.has(title)) {
      continue;
    }

    penaltyByTitle.set(title, getIssuePenalty(issue, basePenaltyByTitle));
  }

  return penaltyByTitle;
};

const calculateScoreFromIssues = (issues, basePenaltyByTitle) => {
  const countsByTitle = buildCountsByTitle(issues);
  const penaltyByTitle = buildPenaltyByTitle(issues, basePenaltyByTitle);

  let totalPenalty = 0;

  for (const [title, count] of countsByTitle.entries()) {
    const basePenalty = penaltyByTitle.get(title) ?? DEFAULT_FALLBACK_PENALTY;
    totalPenalty += basePenalty * (1 + Math.log2(count));
  }

  const score = Math.max(1, 10 - totalPenalty);
  return Math.floor(score);
};

export default (fileName, result) => {
  const prioritizedIssues = result.issues || [];
  const language = getLanguageFromFileName(fileName);
  const penaltyByTitle = getPenaltyByTitle(language);
  const positiveHighlights = buildPositiveHighlights(
    prioritizedIssues,
    result,
    language,
  );

  const score = calculateOverallScore(prioritizedIssues, penaltyByTitle);

  const lines = [
    chalk.bold("Archie: Here is your ArcHone analysis summary."),
    "",
    chalk.bold("What ArcHone analyzed"),
    `- File: ${fileName}`,
    `- Language: ${language}`,
    "",
    chalk.bold("What you did well"),
    ...positiveHighlights,
    "",
    chalk.bold("Bad practices ArcHone detected"),
    `- Total findings: ${prioritizedIssues.length}`,
    `- Severity breakdown: ${formatSeverityBreakdown(prioritizedIssues)}`,
    "",
    chalk.bold("Overall quality score"),
    `- Score: ${score}/10 ${buildScoreBar(score)}`,
    "",
    chalk.bold("Detailed findings"),
    ...formatIssuesForBeginners(prioritizedIssues),
  ];

  return lines.join("\n");
};

const buildScoreBar = (score) => {
  const filled = Math.max(0, Math.min(10, Math.floor(score)));
  return `[${"#".repeat(filled)}${"-".repeat(10 - filled)}]`;
};

const buildTypeCounts = (issues) => {
  const countsByType = new Map();

  for (const issue of issues) {
    const type = getIssueType(issue);
    countsByType.set(type, (countsByType.get(type) || 0) + 1);
  }

  return countsByType;
};

const formatSeverityBreakdown = (issues) => {
  if (!issues.length) {
    return "none";
  }

  const countsByType = buildTypeCounts(issues);
  const parts = [];

  for (const type of TYPE_DISPLAY_ORDER) {
    const count = countsByType.get(type);
    if (!count) {
      continue;
    }

    parts.push(`${type}: ${count}`);
  }

  return parts.join(" | ");
};

const formatTypeTag = (type) => {
  const normalizedType = String(type || "unknown").toLowerCase();
  const label = `[${normalizedType.toUpperCase()}]`;

  const colorByType = {
    critical: chalk.redBright.bold,
    error: chalk.red.bold,
    warning: chalk.yellow.bold,
    improvement: chalk.cyan.bold,
    info: chalk.blue.bold,
    hint: chalk.magenta.bold,
    style: chalk.green.bold,
    unknown: chalk.gray.bold,
  };

  const colorize = colorByType[normalizedType] || chalk.white.bold;
  return colorize(label);
};

const formatIssuesForBeginners = (issues) => {
  if (!issues.length) {
    return ["- No major bad practices found. Nice work."];
  }

  const maxItems = 10;
  const output = issues.slice(0, maxItems).map((issue, index) => {
    const block = [
      `${index + 1}. ${formatTypeTag(getIssueType(issue))} ${issue.title || "Bad Practice"}`,
    ];

    if (issue.functionName) {
      block.push(`   Function: ${issue.functionName}()`);
    }

    if (issue.functionLines) {
      block.push(`   Lines: ${issue.functionLines}`);
    }

    block.push(formatLocation(issue));
    block.push(`   Violated principle: ${getViolatedPrinciple(issue)}`);

    block.push(`   Advice: ${formatAdvice(issue)}\n`);

    return block.join("\n");
  });

  if (issues.length > maxItems) {
    output.push(
      `${maxItems + 1}. More Findings\n   Advice: ...and ${issues.length - maxItems} more bad practices detected.`,
    );
  }

  return output;
};

const calculateOverallScore = (issues, basePenaltyByTitle) => {
  if (!issues.length) {
    return 10;
  }

  return calculateScoreFromIssues(issues, basePenaltyByTitle);
};

const buildPositiveHighlights = (issues, result, language) => {
  if (!issues.length) {
    return [
      "- Great job: no bad practices detected in this file.",
      "- Your current structure and style look consistent.",
    ];
  }

  const highlights = [];
  const issueTitles = new Set(issues.map((issue) => getIssueTitle(issue)));
  const typeCounts = buildTypeCounts(issues);
  const functionCount = Array.isArray(result.functions)
    ? result.functions.length
    : 0;
  const variableCount = Array.isArray(result.variables)
    ? result.variables.length
    : 0;

  if (
    !typeCounts.get("critical") &&
    !typeCounts.get("error") &&
    !typeCounts.get("warning")
  ) {
    highlights.push("- No high-severity findings were detected.");
  }

  if (
    !issueTitles.has("Function Too Long") &&
    !issueTitles.has("Too Many Parameters") &&
    !issueTitles.has("High Complexity") &&
    !issueTitles.has("Deep Nesting") &&
    functionCount > 0
  ) {
    highlights.push(
      "- Your function structure is readable (size, parameters, and control flow are under control).",
    );
  }

  if (
    !issueTitles.has("Poor Variable Naming") &&
    !issueTitles.has("Naming Convention") &&
    variableCount > 0
  ) {
    highlights.push("- Naming looks clear and consistent.");
  }

  if (
    !issueTitles.has("Unused Variable") &&
    !issueTitles.has("Unused Function") &&
    (functionCount > 0 || variableCount > 0)
  ) {
    highlights.push(
      "- Good job avoiding dead code (unused functions/variables).",
    );
  }

  if (
    language === "javascript" &&
    !issueTitles.has("Use of var") &&
    variableCount > 0
  ) {
    highlights.push(
      "- You are using modern JavaScript declaration style (no `var` found).",
    );
  }

  if (
    !issueTitles.has("TODO Comment") &&
    !issueTitles.has("Commented-out Code")
  ) {
    highlights.push(
      "- Comments are clean with no pending TODO/FIXME or commented-out code warnings.",
    );
  }

  if (!highlights.length) {
    highlights.push(
      "- You already have a workable foundation here; fixing a few targeted findings will improve quality quickly.",
    );
  }

  return highlights.slice(0, 3);
};
