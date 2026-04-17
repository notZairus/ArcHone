import path from "path";
import os from "os";
import fs from "fs";

import { ARCHONE_DIR } from "../constants.js";

export function getSession() {
  if (!fs.existsSync(path.join(ARCHONE_DIR, "session.json"))) {
    return {};
  }

  const sessionJson = fs.readFileSync(
    path.join(ARCHONE_DIR, "session.json"),
    "utf8",
  );

  return JSON.parse(sessionJson);
}
