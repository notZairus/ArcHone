import chalk from "chalk";
import fs from "fs";
import path from "path";
import blessed from "blessed";
import { showNotification, refreshScreen } from "../utils/helpers.js";

import { ARCHONE_DIR } from "../constants.js";

export default async function logout({ screen }) {
  refreshScreen(screen);

  const sessionPath = path.join(ARCHONE_DIR, "session.json");

  let isSuccess = false;
  let title = "Signed Out";
  let message = "";

  try {
    fs.mkdirSync(ARCHONE_DIR, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({}, null, 2));

    isSuccess = true;
    message = `${chalk.green("Logout successful.")}\n\nYour local ArcHone session at ${chalk.cyan(sessionPath)} has been cleared.`;
  } catch (error) {
    isSuccess = false;
    title = "Logout Error";
    message = chalk.red(`Logout failed: ${error.message}`);
  }

  await showNotification({ screen, message, title });
  process.exit(0);
}
