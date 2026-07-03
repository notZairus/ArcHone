import fs from "fs";
import path from "path";
import teachIssue from "./issues.js";
import { getLastestAnalysis, getAiConfig } from "../lib/local.js";
import { explainIssueWithGemini } from "../lib/ai.js";
import { formatAiOutput } from "../formatter/explanationFormatter.js";

export default async () => {
  console.clear();

  const analysisData = getLastestAnalysis();

  if (!analysisData) {
    console.error("No latest analysis found.");
    process.exit(1);
  }

  if (!analysisData) {
    console.error("Failed to read the latest analysis data.");
    process.exit(1);
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
    process.exit(1);
  }

  if (selected <= 0 || selected > issues.length) {
    console.error(
      `Invalid issue ID. Please provide a number between 1 and ${issues.length}.`,
    );
    process.exit(1);
  }

  const selectedIssue = issues[selected - 1];
  if (!selectedIssue) {
    console.error("Selected issue not found.");
    process.exit(1);
  }

  const aiConfig = getAiConfig();

  if (!aiConfig.enabled) {
    await teachIssue(selectedIssue.title);
    process.exit(0);
  }

  console.log(`
    ai will explain 
      - Why this issue matters
      - What part of the code caused it
      - Beginner-friendly explanation
      - Suggested fixed code
      - What changed and why
  `);

  try {
    const aiOutput = await explainIssueWithGemini(selectedIssue);
    const formattedAiOutput = formatAiOutput(aiOutput);
    console.clear();
    console.log("\n");
    box(formattedAiOutput);
    console.log("\n");
  } catch (error) {
    console.log("\n");
    await teachIssue(selectedIssue.title);
    process.exit(1);
  }
};
