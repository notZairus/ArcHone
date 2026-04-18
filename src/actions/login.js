import boxen from "boxen";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import clack from "../lib/clack.js";
import { ARCHONE_DIR, CONSOLE_MAX_WIDTH, SESSION_PATH } from "../constants.js";
import { TablesDB } from "appwrite";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";

function isInitialized() {
  if (!fs.existsSync(ARCHONE_DIR) || !fs.existsSync(SESSION_PATH)) {
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
    return false;
  }
  return true;
}

function isLoggedIn() {
  const session = getSession();

  if (!session.userId) {
    return false;
  }

  console.log(
    boxen(
      `${chalk.green("You are already logged in.")}\n\nWelcome back, ${chalk.bold(
        session.name,
      )}! Your ArcHone CLI is connected to your account on this machine.`,
      {
        padding: 1,
        width: CONSOLE_MAX_WIDTH,
        borderStyle: "round",
        title: "Already Logged In",
      },
    ) + "\n",
  );

  return true;
}

export default async function login() {
  console.clear();
  mainBanner();

  if (!isInitialized()) {
    return;
  }

  if (isLoggedIn()) {
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

    if (user.role === "instructor") {
      clack.outro(
        "\n" +
          boxen(
            chalk.red(
              "Instructor accounts cannot log in to the ArcHone CLI. Please use a student account to access the CLI features.",
            ),
            {
              padding: 1,
              width: CONSOLE_MAX_WIDTH,
              title: "Access Denied",
            },
          ),
      );
      return;
    }

    if (user.status !== "verified") {
      clack.outro(
        "\n" +
          boxen(
            chalk.yellow(
              "Your email address is not verified. Please check your email's inbox for a verification email and verify your account before logging in.",
            ),
            {
              padding: 1,
              width: CONSOLE_MAX_WIDTH,
              title: "Email Not Verified",
            },
          ),
      );
      return;
    }

    // Save session data to .archone/session.json
    fs.writeFileSync(
      SESSION_PATH,
      JSON.stringify(
        { userId: user.$id, name: user.name, role: user.role, expire },
        null,
        2,
      ),
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
