import boxen from "boxen";
import { ID } from "appwrite";
import chalk from "chalk";

import clack from "../lib/clack.js";
import open from "open";
import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import Database from "../lib/db.js";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import { box } from "../ui/box.js";
import blessed from "blessed";
import { showNotification, wait, refreshScreen } from "../utils/helpers.js";

export default async function register({ screen }) {
  refreshScreen(screen);
  const registerGuide = [
    `${chalk.bold("Welcome to ArcHone!")}`,
    `Let's create your ArcHone account so you can start analyzing code and tracking your progress!`,
    `Press ${chalk.cyan("Enter")} to open the registration page in your browser.`,
    ``,
    `${chalk.bold("What you will provide")}`,
    "- Email address",
    "- Full name",
    "- Role",
    "- Password and confirmation",
    "",
    `${chalk.bold("After registration")}`,
    `- Run ${chalk.cyan("archone login")} to start your authenticated session`,
  ].join("\n");

  const box = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: "shrink",
    content: registerGuide,
    keys: true,
    padding: {
      left: 2,
      right: 2,
      top: 1,
      bottom: 1,
    },
    border: {
      type: "line",
    },
    label: " Registration ",
  });

  box.focus();

  box.key("enter", async () => {
    const registrationUrl = "http://localhost:5173" + "/register-student";
    await showNotification({
      screen,
      message: "Opening the registration URL on your browser.",
    });
    await open(registrationUrl);
  });

  const closeBtn = blessed.button({
    parent: box,
    content: "X",
    mouse: true,
    width: 1,
    height: 1,
    top: -1,
    right: -1,
  });

  closeBtn.on("press", () => {
    process.exit(0);
  });

  screen.render();
}
