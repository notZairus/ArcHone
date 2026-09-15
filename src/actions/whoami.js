import chalk from "chalk";
import { getSession } from "../utils/session.js";
import {
  refreshScreen,
  showNotification,
  backToMenu,
} from "../utils/helpers.js";

export default async function whoami({ screen, hasActionByDefault }) {
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

  backToMenu(hasActionByDefault);
  return;
}
