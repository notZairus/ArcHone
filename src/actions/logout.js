import boxen from "boxen";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { ARCHONE_DIR, CONSOLE_MAX_WIDTH } from "../constants.js";
import { mainBanner } from "../ui/banner.js";

export default async function logout() {
  console.clear();
  mainBanner();

  const sessionPath = path.join(ARCHONE_DIR, "session.json");

  try {
    fs.mkdirSync(ARCHONE_DIR, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({}, null, 2));

    console.log(
      boxen(
        `${chalk.green("Logout successful.")}\n\nYour local ArcHone session at ${chalk.cyan("~/.archone/session.json")} has been cleared.`,
        {
          padding: 1,
          width: CONSOLE_MAX_WIDTH,
          borderStyle: "round",
          title: "Signed Out",
        },
      ),
    );
  } catch (error) {
    console.log(
      boxen(chalk.red(`Logout failed: ${error.message}`), {
        padding: 1,
        width: CONSOLE_MAX_WIDTH,
        borderStyle: "round",
        title: "Logout Error",
      }),
    );
  }
}
