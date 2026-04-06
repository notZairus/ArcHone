import boxen from "boxen";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import clack from "../lib/clack.js";
import { ARCHONE_DIR, CONSOLE_MAX_WIDTH } from "../constants.js";
import { TablesDB } from "appwrite";
import Database from "../lib/db.js";

export default async function login() {
  console.clear();
  mainBanner();

  const sessionPath = path.join(ARCHONE_DIR, "session.json");

  if (!fs.existsSync(ARCHONE_DIR) || !fs.existsSync(sessionPath)) {
    console.log(
      boxen(
        `${chalk.red("Archie:")} I cannot log you in yet because ArcHone is not initialized.\n\nRun ${chalk.cyan("archone init")} first, then come back and run ${chalk.cyan("archone login")}.`,
        {
          padding: 1,
          width: CONSOLE_MAX_WIDTH,
          borderStyle: "round",
          title: "Initialization Required",
        },
      ),
    );
    clack.outro(chalk.yellow("Login skipped until setup is complete."));
    return;
  }

  const loginGuide = [
    `${chalk.bold("Welcome to ArcHone!")}`,
    "Let's get you logged in to your ArcHone account on this machine.",
    "",
    `${chalk.bold("What this login does")}`,
    "- Connects your local ArcHone CLI to your ArcHone account",
    "- Allows you to run analyses and access your data securely",
    "- Saves a local session for seamless future access",
    ``,
    `${chalk.bold("What happens next")}`,
    "- Enter your ArcHone account email and password",
    "- ArcHone securely verifies your account",
    "- Your local session is saved automatically",
  ].join("\n");

  console.log(
    boxen(loginGuide, {
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "ArcHone Login",
      titleAlignment: "center",
    }),
  );

  const { email, password } = await clack.group(
    {
      email: () =>
        clack.text({
          message: "Enter your email:",
          placeholder: "Email",
        }),
      password: () =>
        clack.password({
          message: "Enter your password:",
          placeholder: "Password",
        }),
    },
    {
      onCancel: () => {
        clack.outro(chalk.yellow("Login cancelled."));
        process.exit(0);
      },
    },
  );

  try {
    const { userId, expire } = await account.createEmailPasswordSession(
      email,
      password,
    );

    const user = await Database.getUserById(userId);

    // Save session data to .archone/session.json
    fs.writeFileSync(
      sessionPath,
      JSON.stringify({ userId, name: user.name, expire }, null, 2),
    );

    clack.outro(
      "\n" +
        boxen(
          `${chalk.green("Login successful.")}\n\nYou are now connected and ArcHone can access your account data on this machine.`,
          {
            padding: 1,
            width: CONSOLE_MAX_WIDTH,
            borderStyle: "round",
            title: "Welcome Back",
          },
        ),
    );
  } catch (error) {
    clack.outro(
      "\n" +
        boxen(chalk.red(`Login failed: ${error.message}`), {
          padding: 1,
          width: CONSOLE_MAX_WIDTH,
          borderStyle: "round",
          title: "Authentication Error",
        }),
    );
  }
}
