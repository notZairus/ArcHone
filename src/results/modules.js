import { getAiConfig } from "../lib/local.js";
import teachIssue from "../actions/issues.js";
import chalk from "chalk";
import { log } from "../utils/helpers.js";
import { detectableIssuesGenericExplanation } from "../constants.js";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { stripCodeFences } from "../utils/helpers.js";

marked.use(markedTerminal());

export function getGenericExplanation(issue) {
  const explanation =
    detectableIssuesGenericExplanation.find((i) => i.title === issue.title) ||
    "No explanation available for this issue.";

  return explanation;
}

export function formatGenericExplanation(explanation) {
  const formattedExplanation = [
    `${chalk.bold(explanation.title)}`,
    "",
    `${chalk.bold("Type: ")}${explanation.severity}`,
    `${chalk.bold("Violated Principle: ")}${explanation.principle}`,
    `\n`,
    `${chalk.bold("Why It Occurred: ")}${explanation.why}`,
    `\n`,
    `${chalk.bold("Suggestion: ")}${explanation.suggestion}`,
    `\n`,
    `${chalk.bold("Current Code Pattern: ")}\n\n${explanation.code}`,
    `\n`,
    `${chalk.bold("Proposed Fix Pattern: ")}\n\n${explanation.fix}`,
  ].join("\n");

  return formattedExplanation;
}

export async function getAiGeneratedExplanationOfIssue(issue) {}

export function formatCode(code, language = false) {
  const strippedCode = stripCodeFences(code);

  const languageMap = {
    js: "javascript",
    py: "python",
    cs: "csharp",
  };

  let _code = `\`\`\` ${languageMap[language] || language}\n${strippedCode}\n\`\`\``;

  return marked.parse(_code);
}
