import boxen from "boxen";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { ARCHONE_DIR, CONSOLE_MAX_WIDTH } from "../constants.js";
import { mainBanner } from "../ui/banner.js";
import { getSession } from "../utils/session.js";

export default async function whoami() {
  console.clear();
  mainBanner();

  const sessionPath = path.join(ARCHONE_DIR, "session.json");
  if (!fs.existsSync(ARCHONE_DIR) || !fs.existsSync(sessionPath)) {
    console.log(
      boxen(
        `${chalk.red("Archie:")} ArcHone is not initialized yet.\n\nRun ${chalk.cyan("archone init")} first, then ${chalk.cyan("archone login")}.`,
        {
          padding: 1,
          width: CONSOLE_MAX_WIDTH,
          borderStyle: "round",
          title: "Initialization Required",
        },
      ),
    );
    return;
  }

  const { name } = getSession();
  if (!name) {
    console.log(
      boxen(
        `${chalk.yellow("Archie:")} I could not find an authenticated user name in your session.\n\nRun ${chalk.cyan("archone login")} to refresh your local session.`,
        {
          padding: 1,
          width: CONSOLE_MAX_WIDTH,
          borderStyle: "round",
          title: "Session Not Found",
        },
      ),
    );
    return;
  }

  console.log(
    boxen(`${chalk.green("Authenticated user:")} ${chalk.cyan(name)}`, {
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "ArcHone Who Am I",
      titleAlignment: "center",
    }),
  );
  console.log("\n");
}
