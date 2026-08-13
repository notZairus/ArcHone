import path from "path";
import os from "os";
import fs from "fs";

import { SESSION_PATH } from "../constants.js";

export function getSession() {
  if (!fs.existsSync(SESSION_PATH)) {
    return {};
  }

  const sessionJson = fs.readFileSync(SESSION_PATH, "utf8");

  return JSON.parse(sessionJson);
}
