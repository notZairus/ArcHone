import chalk from "chalk";

export default (parsed) => {
  const formatted = [
    chalk.bold("ArcHone AI Explanation"),
    "",
    chalk.bold("Why This Matters"),
    parsed.why,
    "",
    chalk.bold("Current Code"),
    formatCodeBlock(parsed.current_code),
    "",
    chalk.bold("Suggested Fix"),
    formatCodeBlock(parsed.fixed_code),
    "",
    chalk.bold("What Changed"),
    parsed.changes,
  ].join("\n");

  return formatted;
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

  return ["", pipedContent, ""].join("\n");
};

const stripSurroundingBlankLines = (text) => {
  return String(text).replace(/^\n+/, "").replace(/\n+$/, "");
};
