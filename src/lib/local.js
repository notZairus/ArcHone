import fs from "fs";
import { SESSION_PATH, LATEST_ANALYSIS_PATH } from "../constants.js";

export const getConfig = () => {
  if (!fs.existsSync(SESSION_PATH)) {
    return {};
  }
  const content = fs.readFileSync(SESSION_PATH, "utf-8");
  const parsed = JSON.parse(content);
  return parsed;
};

export const setConfig = (config) => {
  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(SESSION_PATH, content, "utf-8");
};

export const clearConfig = () => {
  if (fs.existsSync(SESSION_PATH)) {
    fs.unlinkSync(SESSION_PATH);
  }
};

export const getAiConfig = () => {
  const config = getConfig();
  return config.ai || {};
};

export const getLastestAnalysis = () => {
  const analysis = fs.existsSync(LATEST_ANALYSIS_PATH)
    ? JSON.parse(fs.readFileSync(LATEST_ANALYSIS_PATH, "utf-8"))
    : null;
  return analysis;
};

export const setLatestAnalysis = (fileName, analysis) => {
  const content = JSON.stringify({ file: fileName, result: analysis }, null, 2);
  fs.writeFileSync(LATEST_ANALYSIS_PATH, content, "utf-8");
};
