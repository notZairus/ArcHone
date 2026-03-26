import marked from "../lib/marked.js";
import boxen from "boxen";

export default (parsed) => {
  const markdownOutput = [
    "## ArcHone AI Explanation",
    "",
    "### Why This Matters",
    parsed.why,
    "",
    "### Current Code",
    formatCodeBlock(parsed.current_code),
    "",
    "### Suggested Fix",
    formatCodeBlock(parsed.fixed_code),
    "",
    "### What Changed",
    parsed.changes,
  ].join("\n");

  const renderedOutput = marked.parse(markdownOutput);

  return renderedOutput;
};

const formatCodeBlock = (code) => {
  const content = stripSurroundingBlankLines(code || "");
  if (!content) {
    return "(no code provided)";
  }

  const pipedContent = content
    .split("\n")
    .map((line) => `| ${line}`)
    .join("\n");

  return ["```", pipedContent, "```"].join("\n");
};

const stripSurroundingBlankLines = (text) => {
  return String(text).replace(/^\n+/, "").replace(/\n+$/, "");
};
