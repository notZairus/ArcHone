import boxen from "boxen";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { ARCHONE_DIR, CONSOLE_MAX_WIDTH } from "../constants.js";
import { mainBanner } from "../ui/banner.js";
import { getSession } from "../utils/session.js";
import { box } from "../ui/box.js";
import { refreshScreen, showNotification } from "../utils/helpers.js";

export default async function whoami({ screen }) {
  refreshScreen(screen);

  const { name, role } = getSession();
  if (!name) {
    await showNotification({
      screen,
      message: `I could not find an authenticated user in your session.\n\nRun ${chalk.cyan("archone login")} to refresh your local session.`,
      duration: 3000,
    });

    process.exit(0);
  }

  await showNotification({
    screen,
    message: `${chalk.green("Authenticated user:")} ${chalk.cyan(name)}`,
    duration: 3000,
  });

  process.exit(0);
}
