import chalk from "chalk";
import open from "open";
import blessed from "blessed";
import {
  showNotification,
  wait,
  refreshScreen,
  backToMenu,
} from "../utils/helpers.js";
import { getSession } from "../utils/session.js";

export default async function register({ screen, hasActionByDefault }) {
  refreshScreen(screen);

  const { userId } = await getSession();

  if (userId) {
    await showNotification({
      screen,
      message:
        "You are already logged in. Please log out before registering a new account.",
    });

    backToMenu(hasActionByDefault);
    return;
  }

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

  const url = "https://archone-web.vercel.app";

  box.key("enter", async () => {
    const registrationUrl = `${url}/register-student`;
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
    backToMenu(hasActionByDefault);
    return;
  });

  screen.render();
}
