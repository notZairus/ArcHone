import chalk from "chalk";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { boxSilent } from "../../src/ui/box.js";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

marked.use(markedTerminal());

const require = createRequire(import.meta.url);

function buildMarkdown(output, issue) {
  const changeList = Array.isArray(output.whatChanged)
    ? output.whatChanged
        .map((change, index) => [`- ${change}`].join("\n"))
        .join("\n")
    : "No change details provided.";

  return [
    boxSilent({
      text: [
        "",
        `${chalk.bold(output.title || "Untitled AI Output")}`,
        `- Type: ${output.type || "unknown"}`,
        `- Line: ${output.line ?? "n/a"}`,
        `- Message: ${output.message || "No message provided."}`,
        `- Principle: ${output.principle || "No principle provided."}`,
        "",
        `${chalk.bold("Why This Issue Matters")}`,
        output.whyThisIssueMatters || "No explanation provided.",
        "",
        `${chalk.bold("What Part Of The Code Caused It")}`,
        output.whatPartOfTheCodeCausedIt || "No cause provided.",
        "",
        `${chalk.bold("Beginner Friendly Explanation")}`,
        output.beginnerFriendlyExplanation || "No explanation provided.",
        "",
      ].join("\n"),
      style: "none",
    }),
    "---",
    `${chalk.bold("    Current Code")}`,
    "```\n" + issue.code + "\n```" || "No code provided.",
    "---",
    `${chalk.bold("    Suggested Code Fix")}`,
    output.suggestedFixedCode || "No fixed code provided.",
    "---",
    boxSilent({
      text: [`${chalk.bold("What Changed And Why")}`, changeList].join("\n\n"),
      style: "none",
    }),
  ].join("\n\n");
}

function renderWithMarkedTerminal(markdownText) {
  const parsedMarkdown = marked.parse(markdownText);
  return parsedMarkdown;
}

export function formatAiOutput(output, issue) {
  const markdownText = buildMarkdown(output, issue);
  const renderedText = renderWithMarkedTerminal(markdownText);
  return renderedText;
}
