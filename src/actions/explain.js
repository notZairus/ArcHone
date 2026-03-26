import fs from "fs";
import path from "path";

import { ARCHONE_DIR } from "../constants.js";
import { explainIssue } from "../lib/ai.js";
import parseExplanation from "../parser/explanation-parser.js";
import formatExplanation from "../formatter/explanationFormatter.js";
import boxen from "boxen";

export default async () => {
  const latestAnalysisPath = path.join(ARCHONE_DIR, "latest_analysis.json");

  if (!fs.existsSync(latestAnalysisPath)) {
    console.error("No latest analysis found.");
    return;
  }

  const analysisData =
    JSON.parse(fs.readFileSync(latestAnalysisPath, "utf-8")) || {};

  if (!analysisData) {
    console.error("Failed to read the latest analysis data.");
    return;
  }

  const {
    file,
    result: { issues },
  } = analysisData;

  const selected = process.argv[3] || -1;

  if (selected <= 0) {
    console.error(
      "Please provide the issue ID you want to explain. Usage: 'explain <issue_id>'.",
    );
    return;
  }

  if (selected <= 0 || selected > issues.length) {
    console.error(
      `Invalid issue ID. Please provide a number between 1 and ${issues.length}.`,
    );
    return;
  }

  const selectedIssue = issues[selected - 1];

  const response = await explainIssue(selectedIssue);

  if (!response) {
    console.error("Failed to get a valid explanation from the AI.");
    return;
  }

  const parsed = parseExplanation(response);

  if (!parsed) {
    console.error("Failed to parse the AI response.");
    console.log("\nAI response (raw):\n");
    console.log(response);
    return;
  }

  const formattedExplanation = formatExplanation(parsed);

  console.log(
    boxen(formattedExplanation, { padding: 1, borderStyle: "double" }),
  );
};
