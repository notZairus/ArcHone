import chalk from "chalk";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { box } from "../../src/ui/box.js";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

marked.use(
  markedTerminal({
    reflow: true,
    width: 0,
  }),
);

const require = createRequire(import.meta.url);

function buildMarkdown(output, issue) {
  const changeList = Array.isArray(output.whatChanged)
    ? output.whatChanged
        .map((change, index) => [`- ${change}`].join("\n"))
        .join("\n")
    : "No change details provided.";

  return [
    "",
    `# ${output.title || "Untitled AI Output"}`,
    `- Type: ${output.type || "unknown"}`,
    `- Line: ${output.line ?? "n/a"}`,
    `- Message: ${output.message || "No message provided."}`,
    `- Principle: ${output.principle || "No principle provided."}`,
    "",
    "---",
    "## Why This Issue Matters",
    output.whyThisIssueMatters || "No explanation provided.",
    "",
    "## What Part Of The Code Caused It",
    output.whatPartOfTheCodeCausedIt || "No cause provided.",
    "",
    "## Beginner Friendly Explanation",
    output.beginnerFriendlyExplanation.replace("##", "") ||
      "No explanation provided.",
    "",
    "---",
    "## Current Code",
    "```\n" + issue.code + "\n```" || "No code provided.",
    "---",
    "## Suggested Code Fix",
    output.suggestedFixedCode || "No fixed code provided.",
    "---",
    "## What Changed And Why",
    changeList,
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
