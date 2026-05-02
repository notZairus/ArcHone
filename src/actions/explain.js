import fs from "fs";
import path from "path";
import teachIssue from "./issues.js";
import { ARCHONE_DIR } from "../constants.js";

export default async () => {
  console.clear();
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

  const selectedIssue = issues[selected - 1].title;

  await teachIssue(selectedIssue);
};
